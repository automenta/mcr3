const { StrategyExecutionError } = require('../src/errors');

jest.resetModules();

describe('Core Services Error Handling', () => {
  describe('StrategyManager Errors', () => {
    it('should throw StrategyLoadError if a strategy file is invalid', () => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        readdirSync: () => ['invalid-strategy.js'],
        existsSync: () => true,
      }));
      const StrategyManager = require('../src/services/strategyManager');
      expect(() => new StrategyManager({})).toThrow();
    });

    it('should throw StrategyNotFoundError when getting a non-existent strategy', () => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        readdirSync: () => [],
        existsSync: () => true,
      }));
      const StrategyManager = require('../src/services/strategyManager');
      const manager = new StrategyManager({});
      expect(() => manager.getStrategy('non-existent')).toThrow();
    });

    it('should throw StrategyNotFoundError when setting a non-existent strategy', () => {
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        readdirSync: () => [],
        existsSync: () => true,
      }));
      const StrategyManager = require('../src/services/strategyManager');
      const manager = new StrategyManager({});
      expect(() => manager.setActiveStrategy('non-existent')).toThrow();
    });
  });

  describe('StrategyExecutor Errors', () => {
    it('should throw StrategyExecutionError if the strategy fails', async () => {
      const StrategyExecutor = require('../src/services/strategyExecutor');
      const executor = new StrategyExecutor();
      const failingStrategy = {
        name: 'failing-strategy',
        invoke: jest.fn().mockRejectedValue(new Error('Internal LLM Error')),
      };
      await expect(executor.execute(failingStrategy, {})).rejects.toThrow(StrategyExecutionError);
    });
  });
});
