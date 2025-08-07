const fs = require('fs');
const path = require('path');

/**
 * The MCR Service is the central orchestrator of the MCR system.
 * It manages sessions, executes translation strategies, and interacts with
 * the reasoner and other providers.
 */
class MCRService {
  constructor({ reasoner, sessionStore, strategyManager, strategyExecutor }) {
    this.reasoner = reasoner;
    this.sessionStore = sessionStore;
    this.strategyManager = strategyManager;
    this.strategyExecutor = strategyExecutor;
    console.log('MCRService initialized');
  }

  /**
   * Creates a new session and seeds it with a default ontology.
   * @returns {string} The ID of the new session.
   */
  async createSession() {
    const sessionId = this.sessionStore.createSession();
    const reasonerSession = this.reasoner.createSession();

    // Seed the session with a default ontology
    try {
      const ontologyPath = path.join(__dirname, '..', 'ontologies', 'family.pl');
      const ontology = fs.readFileSync(ontologyPath, 'utf8');
      await this.reasoner.consult(reasonerSession, ontology);
      this.sessionStore.updateSession(sessionId, { reasonerSession, kb: ontology });
      console.log(`Session ${sessionId} seeded with default ontology.`);
    } catch (error) {
      console.error(`Could not seed session ${sessionId} with default ontology:`, error);
      // Still create the session, just without the seeded knowledge
      this.sessionStore.updateSession(sessionId, { reasonerSession });
    }

    return sessionId;
  }

  async assert(sessionId, naturalLanguageInput, strategyName) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const strategy = strategyName
      ? this.strategyManager.getStrategy(strategyName)
      : this.strategyManager.getActiveStrategy();

    if (!strategy) throw new Error(`Strategy not found: ${strategyName || 'active'}`);

    const prologCode = await this.strategyExecutor.execute(strategy, { input: naturalLanguageInput });

    await this.reasoner.consult(session.reasonerSession, prologCode);

    const updatedKb = session.kb ? `${session.kb}\n${prologCode}` : prologCode;
    this.sessionStore.updateSession(sessionId, { kb: updatedKb });

    return { success: true, asserted: prologCode, strategy: strategy.name };
  }

  async query(sessionId, naturalLanguageInput, strategyName) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // 1. Translate NL to a Prolog query
    const queryStrategy = this.strategyManager.getStrategy(strategyName || 'nl-to-rule') || this.strategyManager.getActiveStrategy();
    if (!queryStrategy) throw new Error(`Could not determine a strategy for NL-to-Query translation.`);

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

  getKnowledgeBase(sessionId) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) {
      // To be consistent with tool_result format, we can return the error this way
      return { success: false, error: `Session not found: ${sessionId}` };
    }
    return { success: true, kb: session.kb };
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
