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

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Provide mock implementations for the services
    mockStrategyManager = new StrategyManager();
    mockStrategyManager.getActiveStrategy = jest.fn(() => ({ name: 'nl-to-fact' }));
    mockStrategyManager.getStrategy = jest.fn((name) => ({ name }));

    mockStrategyExecutor = new StrategyExecutor();
    mockStrategyExecutor.execute = jest.fn((strategy, input) => Promise.resolve(`${strategy.name}(${input.input}).`));

    mcrService = new MCRService({
      reasoner,
      sessionStore,
      strategyManager: mockStrategyManager,
      strategyExecutor: mockStrategyExecutor,
    });
  });

  describe('createSession', () => {
    test('should create a session and seed it with the default ontology', async () => {
      const mockOntology = "family_tree_rules.";
      fs.readFileSync.mockReturnValue(mockOntology);

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
    test('should use the active strategy to assert a fact', async () => {
      const input = 'Socrates is a man';
      const expectedProlog = 'nl-to-fact(Socrates is a man).';

      const result = await mcrService.assert('mockSessionId', input);

      expect(mockStrategyManager.getActiveStrategy).toHaveBeenCalled();
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: 'nl-to-fact' }, { input });
      expect(reasoner.consult).toHaveBeenCalledWith({ id: 'prologSession' }, expectedProlog);
      expect(result.asserted).toBe(expectedProlog);
    });
  });

  describe('query', () => {
    test('should use the nl-to-rule strategy by default to query', async () => {
      const input = 'is Socrates a man?';
      const expectedProlog = 'nl-to-rule(is Socrates a man?).';

      const result = await mcrService.query('mockSessionId', input);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('nl-to-rule');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: 'nl-to-rule' }, { input });
      expect(reasoner.query).toHaveBeenCalledWith({ id: 'prologSession' }, expectedProlog);
      expect(result.answers).toEqual(['X = test']);
    });
  });

  describe('explain', () => {
    test('should use the rules-to-nl strategy to explain a rule', async () => {
      const input = 'man(socrates).';
      const expectedNl = 'rules-to-nl(man(socrates).).';

      const result = await mcrService.explain('mockSessionId', input);

      expect(mockStrategyManager.getStrategy).toHaveBeenCalledWith('rules-to-nl');
      expect(mockStrategyExecutor.execute).toHaveBeenCalledWith({ name: 'rules-to-nl' }, { input });
      expect(result.explanation).toBe(expectedNl);
    });
  });
});
