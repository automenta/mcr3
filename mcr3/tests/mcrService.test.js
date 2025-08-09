const fs = require('fs');
const MCRService = require('../src/services/mcrService');

// Mock all dependencies
jest.mock('fs');

jest.mock('../src/providers/prologReasoner', () => ({
  createSession: jest.fn(() => ({ id: 'prologSession' })),
  consult: jest.fn(() => Promise.resolve(true)),
  query: jest.fn(() => Promise.resolve(true)),
  getAnswers: jest.fn(() => Promise.resolve([{ toString: () => 'X = test' }])),
}));

jest.mock('../src/store/sessionStore', () => ({
  createSession: jest.fn(() => 'mockSessionId'),
  getSession: jest.fn(() => ({ id: 'mockSessionId', kb: '', reasonerSession: { id: 'prologSession' } })),
  updateSession: jest.fn(),
}));

// Mock the new services
jest.mock('../src/services/strategyManager');
jest.mock('../src/services/strategyExecutor');

const reasoner = require('../src/providers/prologReasoner');
const sessionStore = require('../src/store/sessionStore');
const StrategyManager = require('../src/services/strategyManager');
const StrategyExecutor = require('../src/services/strategyExecutor');

describe('MCRService', () => {
  let mcrService;
  let mockStrategyManager;
  let mockStrategyExecutor;

  // Mock the LLM provider to avoid actual LLM creation
  jest.mock('../src/providers/llmProvider', () => ({
      createLlm: jest.fn(() => ({})), // Return a dummy LLM object
      getAvailableProviders: jest.fn(() => ['openai', 'gemini']),
  }));

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Since StrategyManager is mocked, we can configure its mock instance
    // The constructor will be called by MCRService, and we can grab the instance
    StrategyManager.mockImplementation(() => {
        return {
            getActiveStrategy: jest.fn(() => ({ name: 'nl-to-fact' })),
            getStrategy: jest.fn((name) => ({ name })),
            rebuildStrategies: jest.fn(),
        };
    });

    mockStrategyExecutor = new StrategyExecutor();
    mockStrategyExecutor.execute = jest.fn((strategy, input) => Promise.resolve(`${strategy.name}(${input.input}).`));

    mcrService = new MCRService({
      reasoner,
      sessionStore,
      strategyExecutor: mockStrategyExecutor,
    });

    // The instance of the mock strategy manager created inside MCRService
    mockStrategyManager = mcrService.strategyManager;
  });

  describe('createSession', () => {
    test('should create a session and seed it with the default ontology', async () => {
      const mockOntology = "family_tree_rules.";
      fs.readFileSync.mockReturnValue(mockOntology);
      fs.existsSync.mockReturnValue(true); // Make sure the file is found

      const sessionId = await mcrService.createSession();

      expect(sessionStore.createSession).toHaveBeenCalled();
      expect(reasoner.createSession).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf8');
      expect(reasoner.consult).toHaveBeenCalledWith({ id: 'prologSession' }, mockOntology);
      expect(sessionStore.updateSession).toHaveBeenCalledWith(sessionId, expect.objectContaining({ kb: mockOntology }));
      expect(sessionId).toBe('mockSessionId');
    });
  });

  describe('assert', () => {
    test('should use a specific strategy to assert a fact if provided', async () => {
      const input = 'Socrates is a man';
      const strategyName = 'nl-to-conditional-rule';
      const expectedProlog = `${strategyName}(${input}).`;

      const result = await mcrService.assert('mockSessionId', input, strategyName);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith(strategyName);
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: strategyName }, { input });
      expect(reasoner.consult).toHaveBeenCalledWith({ id: 'prologSession' }, expectedProlog);
      expect(result.asserted).toBe(expectedProlog);
    });
  });

  describe('query', () => {
    test('should translate NL->Prolog, get answers, and translate Prolog->NL', async () => {
      const input = 'is Socrates a man?';
      const prologQuery = 'nl-to-query(is_socrates_a_man).';
      // The mock reasoner returns substitutions with a 'links' property, which is what the service uses.
      const structuredAnswers = [{ links: { X: 'test' } }];
      const finalAnswer = "Yes, Socrates is a man.";

      // Mock the strategy implementations for this specific test
      mockStrategyManager.getStrategy.mockImplementation(name => {
        if (name === 'nl-to-query') return { name: 'nl-to-query' };
        if (name === 'answers-to-nl') return { name: 'answers-to-nl' };
        return { name: 'some-default' };
      });

      mockStrategyExecutor.execute.mockImplementation(async (strategy, inputs) => {
        if (strategy.name === 'nl-to-query') return prologQuery;
        if (strategy.name === 'answers-to-nl') return finalAnswer;
        return 'default execution';
      });

      // Ensure the mock reasoner provides the expected answer structure
      reasoner.getAnswers.mockResolvedValue(structuredAnswers);

      const result = await mcrService.query('mockSessionId', input, 'nl-to-query');

      // 1. Verify the NL -> Prolog step
      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('nl-to-query');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: 'nl-to-query' }, { input });
      expect(reasoner.query).toHaveBeenCalledWith({ id: 'prologSession' }, prologQuery);

      // 2. Verify the Prolog -> NL step
      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('answers-to-nl');
      const answersAsString = JSON.stringify(structuredAnswers.map(a => a.links));
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith(
        { name: 'answers-to-nl' },
        { query: input, answers: answersAsString }
      );

      // 3. Verify the final result
      expect(result.answer).toEqual(finalAnswer);
    });
  });

  describe('explain', () => {
    test('should use the rules-to-nl strategy to explain a rule', async () => {
      const input = 'man(socrates).';
      const expectedNl = 'rules-to-nl(man(socrates).).';

      const result = await mcrService.explain('mockSessionId', input);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('rules-to-nl');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: 'rules-to-nl' }, { input: input });
      expect(result.explanation).toBe(expectedNl);
    });
  });

  describe('explainQueryTrace', () => {
    test('should use the query-trace-to-nl strategy to explain a trace', async () => {
      const query = 'mortal(socrates).';
      const trace = '...trace...';
      const expectedNl = 'Socrates is mortal because...';
      mockStrategyExecutor.execute.mockResolvedValue(expectedNl);

      const result = await mcrService.explainQueryTrace('mockSessionId', query, trace);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('query-trace-to-nl');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith(
        { name: 'query-trace-to-nl' },
        { knowledge_base: '', query, trace }
      );
      expect(result.explanation).toBe(expectedNl);
    });
  });

  describe('generateTestCases', () => {
    test('should use the generate-test-cases strategy to generate test cases', async () => {
      const rule = 'mortal(X) :- man(X).';
      const expectedTestCases = { setup: [], assertions: [] };
      mockStrategyExecutor.execute.mockResolvedValue(expectedTestCases);

      const result = await mcrService.generateTestCases('mockSessionId', rule);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('generate-test-cases');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith(
        { name: 'generate-test-cases' },
        { rule }
      );
      expect(result.testCases).toBe(expectedTestCases);
    });
  });
});
