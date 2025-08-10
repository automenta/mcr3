const MCRService = require('../src/services/mcrService');
const PrologReasoner = require('../src/providers/prologReasoner');
const SessionStore = require('../src/store/sessionStore');
const StrategyExecutor = require('../src/services/strategyExecutor');

// Mock the LLM provider to avoid real API calls
jest.mock('../src/providers/llmProvider', () => {
  // AIMessage must be required inside the mock factory
  const { AIMessage } = require('@langchain/core/messages');
  return {
    createLlm: () => ({
      invoke: jest.fn().mockImplementation(async (prompt) => {
        const promptString = prompt.toString();
        if (promptString.includes('Socrates is a man')) {
          return new AIMessage({ content: "man('Socrates')." });
        }
        if (promptString.includes('Adam is human and Eve is human')) {
          return new AIMessage({
            content: JSON.stringify({ facts: ["human('Adam').", "human('Eve')."] }),
          });
        }
        if (promptString.includes('Who is a man?')) {
          return new AIMessage({ content: 'man(Who).' });
        }
        if (promptString.includes("man('Socrates').")) {
          return new AIMessage({ content: 'Socrates is a man.' });
        }
        if (
          promptString.includes('sibling(X, Y) :- parent(Z, X), parent(Z, Y).')
        ) {
          return new AIMessage({
            content: 'sibling(X, Y) :- parent(Z, X), parent(Z, Y), X \\= Y.',
          });
        }
        if (promptString.includes('query": "Who is a man?"')) {
          return new AIMessage({ content: 'Socrates is a man.' });
        }
        // Default fallback for query
        return new AIMessage({ content: 'test_query(X).' });
      }),
    }),
    getAvailableProviders: () => ['openai', 'gemini', 'ollama'],
  };
});


describe('Strategies Integration Test', () => {
  it('should parse a valid AIMessage', async () => {
    const { StringOutputParser } = require('@langchain/core/output_parsers');
    const { AIMessage } = require('@langchain/core/messages');
    const parser = new StringOutputParser();
    const message = new AIMessage({ content: 'hello' });
    const result = await parser.invoke(message);
    expect(result).toBe('hello');
  });

  let mcrService;
  let sessionId;

  beforeAll(() => {
    const reasoner = new PrologReasoner();
    const sessionStore = new SessionStore();
    const strategyExecutor = new StrategyExecutor();
    mcrService = new MCRService({ reasoner, sessionStore, strategyExecutor });
  });

  beforeEach(async () => {
    sessionId = await mcrService.createSession();
  });

  // Give the tests a bit more time as they involve network calls
  jest.setTimeout(30000); // 30 seconds

  it('should assert a single fact using nl-to-fact', async () => {
    const result = await mcrService.assert(sessionId, 'Socrates is a man.', 'nl-to-fact');
    expect(result.success).toBe(true);
    expect(result.asserted).toBe("man('Socrates').");
    const kb = await mcrService.getKnowledgeBase(sessionId);
    expect(kb.kb).toContain("man('Socrates').");
  });

  it('should assert multiple facts using nl-to-multi-fact', async () => {
    const result = await mcrService.assert(sessionId, 'Adam is human and Eve is human.', 'nl-to-multi-fact');
    expect(result.success).toBe(true);
    // Note: The output from the LLM might have variable spacing.
    expect(result.asserted).toContain("human('Adam').");
    expect(result.asserted).toContain("human('Eve').");
    const kb = await mcrService.getKnowledgeBase(sessionId);
    expect(kb.kb).toContain("human('Adam').");
    expect(kb.kb).toContain("human('Eve').");
  });

  it('should ask a question using nl-to-query', async () => {
    await mcrService.assert(sessionId, 'Socrates is a man.', 'nl-to-fact');
    const result = await mcrService.query(sessionId, 'Who is a man?', 'nl-to-query');
    expect(result.success).toBe(true);
    // The NL answer can vary, so we check for the key entity.
    expect(result.answer.toLowerCase()).toContain('socrates');
  });

  it('should explain a fact using fact-to-nl', async () => {
    // This test doesn't need to assert, it just translates.
    const result = await mcrService.explain(sessionId, "man('Socrates').");
    expect(result.success).toBe(true);
    expect(result.explanation.toLowerCase()).toContain('socrates is a man');
  });

  it('should critique and refine a rule using critique-and-refine-rule', async () => {
    const result = await mcrService.critiqueAndRefine(sessionId, 'sibling(X, Y) :- parent(Z, X), parent(Z, Y).');
    expect(result.success).toBe(true);
    // The refined rule should contain the inequality check.
    expect(result.refinedRule).toContain('X \\= Y');
  });
});
