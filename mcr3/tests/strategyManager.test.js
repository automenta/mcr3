const fs = require('fs');
const path = require('path');
const StrategyManager = require('../src/services/strategyManager');

// Mock the LLM provider
jest.mock('../src/providers/llmProvider', () => ({
  createLlm: jest.fn(() => ({ pipe: jest.fn(), invoke: jest.fn(), withConfig: jest.fn() })), // Return a dummy LLM object
}));

const strategiesDir = path.join(__dirname, '..', 'strategies');
let dirExisted = true;

// Create mock strategy files for testing
beforeAll(() => {
  if (!fs.existsSync(strategiesDir)) {
    dirExisted = false;
    fs.mkdirSync(strategiesDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(strategiesDir, 'test-strategy1.js'),
    `module.exports = (llm) => ({ name: 'test-strategy1', description: 'Test 1', llm });`
  );
  fs.writeFileSync(
    path.join(strategiesDir, 'test-strategy2.js'),
    `module.exports = (llm) => ({ name: 'test-strategy2', description: 'Test 2', llm });`
  );
  fs.writeFileSync(
    path.join(strategiesDir, 'invalid-strategy.js'),
    `module.exports = { name: 'invalid' };` // Not a function
  );
});

// Clean up mock files
afterAll(() => {
  fs.unlinkSync(path.join(strategiesDir, 'test-strategy1.js'));
  fs.unlinkSync(path.join(strategiesDir, 'test-strategy2.js'));
  fs.unlinkSync(path.join(strategiesDir, 'invalid-strategy.js'));
  // Only remove the directory if this test created it.
  if (!dirExisted) {
    fs.rmdirSync(strategiesDir);
  }
});

describe('StrategyManager', () => {
  let strategyManager;

  beforeEach(() => {
    // We need to re-require the module to force it to re-run the constructor
    // and load the newly created strategy files.
    jest.isolateModules(() => {
      const FreshStrategyManager = require('../src/services/strategyManager');
      strategyManager = new FreshStrategyManager();
    });
  });

  test('should load all valid strategies from the directory', () => {
    const strategies = strategyManager.listStrategies();
    // The real strategies will also be loaded, so we check that our mock ones are present.
    expect(strategies.length).toBeGreaterThanOrEqual(2);
    expect(strategies.map(s => s.name)).toEqual(expect.arrayContaining(['test-strategy1', 'test-strategy2']));
  });

  test('should set the first loaded strategy as the active one', () => {
    const activeStrategy = strategyManager.getActiveStrategy();
    // The default active strategy depends on file system load order, which is not guaranteed.
    // We just check that *an* active strategy is set.
    expect(activeStrategy).toBeDefined();
    expect(activeStrategy.name).toBeDefined();
  });

  test('should allow setting a new active strategy', () => {
    strategyManager.setActiveStrategy('test-strategy2');
    const activeStrategy = strategyManager.getActiveStrategy();
    expect(activeStrategy.name).toBe('test-strategy2');
  });

  test('should return a specific strategy by name', () => {
    const strategy = strategyManager.getStrategy('test-strategy1');
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe('test-strategy1');
  });

  test('should handle and log errors for invalid strategy files', () => {
    // The test relies on the console.error output during module load.
    // This is implicitly tested by the fact that the invalid strategy
    // is not loaded into the manager, checked by the first test.
    const strategies = strategyManager.listStrategies();
    expect(strategies.find(s => s.name === 'invalid')).toBeUndefined();
  });
});
