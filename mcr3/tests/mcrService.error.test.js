const MCRService = require('../src/services/mcrService');
const { SessionNotFoundError, InvalidInputError, StrategyNotFoundError } = require('../src/errors');
const StrategyManager = require('../src/services/strategyManager');

// Mock dependencies
const mockSessionStore = {
  getSession: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn(),
};

const mockReasoner = {
  createSession: jest.fn(),
  consult: jest.fn(),
  query: jest.fn(),
  getAnswers: jest.fn(),
};

const mockStrategyExecutor = {
  execute: jest.fn(),
};

// Mock the StrategyManager and capture its instance so we can manipulate its methods in tests.
let mockStrategyManagerInstance;
jest.mock('../src/services/strategyManager', () => {
  return jest.fn().mockImplementation(() => {
    mockStrategyManagerInstance = {
      getStrategy: jest.fn(),
      listStrategies: jest.fn(),
      setActiveStrategy: jest.fn(),
      getActiveStrategy: jest.fn(),
    };
    return mockStrategyManagerInstance;
  });
});

describe('MCRService Error Handling', () => {
  let mcrService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    StrategyManager.mockClear();

    // Create a new MCRService instance. This will also create a new mock StrategyManager instance
    // and assign it to our captured variable `mockStrategyManagerInstance`.
    mcrService = new MCRService({
      reasoner: mockReasoner,
      sessionStore: mockSessionStore,
      strategyExecutor: mockStrategyExecutor,
    });
  });

  describe('assert', () => {
    it('should throw InvalidInputError for invalid input', async () => {
      await expect(mcrService.assert('sid', null)).rejects.toThrow(InvalidInputError);
    });

    it('should throw SessionNotFoundError if session is not found', async () => {
      mockSessionStore.getSession.mockReturnValue(null);
      await expect(mcrService.assert('sid', 'test')).rejects.toThrow(SessionNotFoundError);
    });

    it('should throw StrategyNotFoundError if strategy is not found', async () => {
      mockSessionStore.getSession.mockReturnValue({ kb: '' });
      mockStrategyManagerInstance.getStrategy.mockImplementation(() => {
        // This simulates the behavior of getStrategy when a strategy is not found.
        // In the real implementation, this error is thrown by the manager itself.
        throw new StrategyNotFoundError('test-strat');
      });
      await expect(mcrService.assert('sid', 'test', 'test-strat')).rejects.toThrow(StrategyNotFoundError);
    });
  });

  describe('query', () => {
    it('should throw SessionNotFoundError if session is not found', async () => {
        mockSessionStore.getSession.mockReturnValue(null);
        await expect(mcrService.query('sid', 'test')).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe('retract', () => {
    it('should throw SessionNotFoundError if session is not found', async () => {
        mockSessionStore.getSession.mockReturnValue(null);
        await expect(mcrService.retract('sid', 'test')).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe('assertAndQuery', () => {
    it('should throw SessionNotFoundError if session is not found', async () => {
      mockSessionStore.getSession.mockReturnValue(null);
      await expect(mcrService.assertAndQuery('sid', 'test')).rejects.toThrow(SessionNotFoundError);
    });

    it('should throw StrategyNotFoundError if strategy is not found', async () => {
      mockSessionStore.getSession.mockReturnValue({ kb: '' });
      mockStrategyManagerInstance.getStrategy.mockImplementation(() => {
        throw new StrategyNotFoundError('test-strat');
      });
      await expect(mcrService.assertAndQuery('sid', 'test', 'test-strat')).rejects.toThrow(StrategyNotFoundError);
    });
  });
});
