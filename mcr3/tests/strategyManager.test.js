const fs = require('fs');
const path = require('path');
const StrategyManager = require('../src/services/strategyManager');
const { createMockLlm } = require('./testUtils');
const { StrategyNotFoundError, StrategyLoadError } = require('../src/errors');

// Mock fs.readdirSync to avoid touching the actual file system
jest.mock('fs');

describe('StrategyManager', () => {
  let strategyManager;
  const mockLlm = createMockLlm('test');

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  });

  it('should load all valid strategies from the directory', () => {
    // Arrange
    const mockFiles = ['strategy1.js', 'strategy2.js'];
    fs.readdirSync.mockReturnValue(mockFiles);

    // Mock the require calls for each file
    jest.mock(path.join(__dirname, '..', 'strategies', 'strategy1.js'), () => (llm) => ({ name: 'strategy1', description: 'Test 1', llm }), { virtual: true });
    jest.mock(path.join(__dirname, '..', 'strategies', 'strategy2.js'), () => (llm) => ({ name: 'strategy2', description: 'Test 2', llm }), { virtual: true });

    // Act
    strategyManager = new StrategyManager(mockLlm);
    const strategies = strategyManager.listStrategies();

    // Assert
    expect(strategies.length).toBe(2);
    expect(strategies.map(s => s.name)).toEqual(['strategy1', 'strategy2']);
  });

  it('should set the first loaded strategy as the active one', () => {
    const mockFiles = ['strategy1.js', 'strategy2.js'];
    fs.readdirSync.mockReturnValue(mockFiles);
    jest.mock(path.join(__dirname, '..', 'strategies', 'strategy1.js'), () => (llm) => ({ name: 'strategy1', llm }), { virtual: true });
    jest.mock(path.join(__dirname, '..', 'strategies', 'strategy2.js'), () => (llm) => ({ name: 'strategy2', llm }), { virtual: true });

    strategyManager = new StrategyManager(mockLlm);
    const activeStrategy = strategyManager.getActiveStrategy();

    expect(activeStrategy).toBeDefined();
    expect(activeStrategy.name).toBe('strategy1');
  });

  it('should throw StrategyLoadError for invalid strategy files', () => {
    const mockFiles = ['invalid-strategy.js'];
    fs.readdirSync.mockReturnValue(mockFiles);

    // This mock simulates a file that doesn't export a function
    jest.mock(path.join(__dirname, '..', 'strategies', 'invalid-strategy.js'), () => ({ name: 'invalid' }), { virtual: true });

    // Assert
    expect(() => new StrategyManager(mockLlm)).toThrow(StrategyLoadError);
  });

  it('should throw StrategyNotFoundError when getting a non-existent strategy', () => {
    fs.readdirSync.mockReturnValue([]); // No strategies loaded
    strategyManager = new StrategyManager(mockLlm);

    expect(() => strategyManager.getStrategy('non-existent')).toThrow(StrategyNotFoundError);
  });
});
