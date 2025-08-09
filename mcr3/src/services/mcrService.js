const fs = require('fs');
const path = require('path');
const { createLlm, getAvailableProviders } = require('../providers/llmProvider');
const StrategyManager = require('./strategyManager');

/**
 * The MCR Service is the central orchestrator of the MCR system.
 * It manages sessions, executes translation strategies, and interacts with
 * the reasoner and other providers.
 */
class MCRService {
  constructor({ reasoner, sessionStore, strategyExecutor }) {
    this.reasoner = reasoner;
    this.sessionStore = sessionStore;
    this.strategyExecutor = strategyExecutor;

    // Initialize LLM and StrategyManager
    this.initializeLlm();

    console.log('MCRService initialized');
  }

  /**
   * Initializes the LLM provider and strategy manager based on environment variables.
   */
  initializeLlm() {
    const provider = process.env.MCR_LLM_PROVIDER?.toLowerCase() || 'openai';
    const options = {
        apiKey: process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY,
        model: process.env.MCR_LLM_MODEL,
    };
    if (provider === 'ollama') {
        options.baseUrl = process.env.OLLAMA_BASE_URL;
    }
    if (provider === 'openai' && process.env.OPENAI_API_BASE) {
        options.baseURL = process.env.OPENAI_API_BASE;
    }

    this.llmConfig = { provider, options };
    const llm = createLlm(provider, options);
    this.strategyManager = new StrategyManager(llm);
  }

  /**
   * Creates a new session and seeds it with a default ontology.
   * @returns {string} The ID of the new session.
   */
  async createSession() {
    const sessionId = this.sessionStore.createSession();
    const reasonerSession = this.reasoner.createSession();
    this.sessionStore.updateSession(sessionId, { reasonerSession, kb: '' });

    // Seed the session with a default ontology
    try {
      const ontologyPath = path.join(__dirname, '..', '..', 'ontologies', 'family.pl');
      if (fs.existsSync(ontologyPath)) {
        const ontology = fs.readFileSync(ontologyPath, 'utf8');
        await this.reasoner.consult(reasonerSession, ontology);
        this.sessionStore.updateSession(sessionId, { kb: ontology });
        console.log(`Session ${sessionId} seeded with default ontology.`);
      } else {
        console.warn(`Default ontology 'family.pl' not found. Session created with an empty knowledge base.`);
      }
    } catch (error) {
      // If seeding fails, we still have a valid session, but we should log it.
      console.error(`Error seeding session ${sessionId} with default ontology:`, error);
      // We don't throw here, as a session with an empty KB is still a valid state.
    }

    return sessionId;
  }

  async assert(sessionId, naturalLanguageInput, strategyName) {
    if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string') {
      throw new Error('Invalid input: naturalLanguageInput must be a non-empty string.');
    }
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const strategy = strategyName
      ? this.strategyManager.getStrategy(strategyName)
      : this.strategyManager.getStrategy('nl-to-fact'); // Sensible default

    if (!strategy) throw new Error(`Strategy not found: ${strategyName || 'nl-to-fact'}`);

    const prologCode = await this.strategyExecutor.execute(strategy, { input: naturalLanguageInput });

    // Handle strategies that might return arrays (like nl-to-multi-fact)
    const assertions = Array.isArray(prologCode) ? prologCode.join('\n') : prologCode;

    await this.reasoner.consult(session.reasonerSession, assertions);

    const updatedKb = session.kb ? `${session.kb}\n${assertions}` : assertions;
    this.sessionStore.updateSession(sessionId, { kb: updatedKb });

    return { success: true, asserted: assertions, strategy: strategy.name };
  }

  async query(sessionId, naturalLanguageInput, strategyName) {
    if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string') {
      throw new Error('Invalid input: naturalLanguageInput must be a non-empty string.');
    }
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // 1. Translate NL to a Prolog query
    const queryStrategy = this.strategyManager.getStrategy(strategyName || 'nl-to-query');
    if (!queryStrategy) throw new Error(`Could not find a suitable strategy for NL-to-Query translation. Looked for: ${strategyName || 'nl-to-query'}`);

    const queryString = await this.strategyExecutor.execute(queryStrategy, { input: naturalLanguageInput });

    // 2. Execute the query in the reasoner
    await this.reasoner.query(session.reasonerSession, queryString);
    const structuredAnswers = await this.reasoner.getAnswers(session.reasonerSession);

    // 3. Translate the structured answers back to natural language
    const answerStrategy = this.strategyManager.getStrategy('answers-to-nl');
    if (!answerStrategy) {
      console.warn("The 'answers-to-nl' strategy is not available. Returning raw answers.");
      return { success: true, answers: structuredAnswers.map(a => a.toString()), strategy: queryStrategy.name };
    }

    // The answers need to be formatted as a string for the prompt
    const answersAsString = JSON.stringify(structuredAnswers.map(a => a.links));
    const naturalLanguageAnswer = await this.strategyExecutor.execute(answerStrategy, {
      query: naturalLanguageInput,
      answers: answersAsString,
    });

    return { success: true, answer: naturalLanguageAnswer, strategy: queryStrategy.name };
  }

  async explain(sessionId, prologRule) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const strategy = this.strategyManager.getStrategy('rules-to-nl');
    if (!strategy) throw new Error(`The 'rules-to-nl' strategy is not available.`);

    const explanation = await this.strategyExecutor.execute(strategy, { input: prologRule });

    return { success: true, explanation, strategy: strategy.name };
  }

  async critiqueAndRefine(sessionId, naturalLanguageInput, strategyName) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const strategy = this.strategyManager.getStrategy(strategyName || 'critique-and-refine-rule');
    if (!strategy) throw new Error(`Could not find a suitable strategy for critique-and-refine. Looked for: ${strategyName || 'critique-and-refine-rule'}`);

    const refinedRule = await this.strategyExecutor.execute(strategy, { input: naturalLanguageInput });

    return { success: true, refinedRule, strategy: strategy.name };
  }

  getKnowledgeBase(sessionId) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) {
      // To be consistent with tool_result format, we can return the error this way
      return { success: false, error: `Session not found: ${sessionId}` };
    }
    return { success: true, kb: session.kb };
  }

  // --- LLM Configuration Management ---

  getLlmConfig() {
    return { success: true, config: this.llmConfig };
  }

  async setLlmConfig(config) {
    try {
      const { provider, options } = config;
      const newLlm = createLlm(provider, options);
      // Rebuild strategies with the new LLM
      this.strategyManager.rebuildStrategies(newLlm);
      // Update current config
      this.llmConfig = config;
      console.log('LLM configuration updated and strategies rebuilt.');
      return { success: true, message: 'LLM configuration updated successfully.' };
    } catch (error) {
      console.error('Failed to set new LLM config:', error);
      return { success: false, error: error.message };
    }
  }

  getAvailableLlmProviders() {
    return { success: true, providers: getAvailableProviders() };
  }


  // --- Strategy Management ---

  listStrategies() {
    return this.strategyManager.listStrategies();
  }

  setActiveStrategy(name) {
    const success = this.strategyManager.setActiveStrategy(name);
    if (!success) {
      throw new Error(`Strategy not found: ${name}`);
    }
    return { success: true, activeStrategy: name };
  }

  getActiveStrategy() {
    const activeStrategy = this.strategyManager.getActiveStrategy();
    if (!activeStrategy) {
      return { activeStrategy: null };
    }
    return {
      name: activeStrategy.name,
      description: activeStrategy.description,
    };
  }
}

module.exports = MCRService;
