const StrategyExecutor = require('../src/services/strategyExecutor');

describe('StrategyExecutor', () => {
  let strategyExecutor;
  let mockStrategy;

  beforeEach(() => {
    strategyExecutor = new StrategyExecutor();
    mockStrategy = {
      invoke: jest.fn(),
    };
  });

  test('should execute a valid strategy and return the result', async () => {
    const inputs = { input: 'test' };
    const expectedOutput = 'success';
    mockStrategy.invoke.mockResolvedValue(expectedOutput);

    const result = await strategyExecutor.execute(mockStrategy, inputs);

    expect(mockStrategy.invoke).toHaveBeenCalledWith(inputs);
    expect(result).toBe(expectedOutput);
  });

  test('should handle strategy output as a content object', async () => {
    const inputs = { input: 'test' };
    const expectedOutput = { content: 'success from object' };
    mockStrategy.invoke.mockResolvedValue(expectedOutput);

    const result = await strategyExecutor.execute(mockStrategy, inputs);

    expect(result).toBe(expectedOutput.content);
  });

  test('should throw an error if the strategy is not a valid runnable', async () => {
    const invalidStrategy = {}; // Does not have an 'invoke' method
    const inputs = { input: 'test' };

    await expect(strategyExecutor.execute(invalidStrategy, inputs))
      .rejects
      .toThrow('Invalid strategy provided. Must be a LangChain runnable.');
  });

  test('should re-throw a specific error if strategy execution fails', async () => {
    const inputs = { input: 'test' };
    const originalError = new Error('LLM call failed');
    mockStrategy.invoke.mockRejectedValue(originalError);

    await expect(strategyExecutor.execute(mockStrategy, inputs))
      .rejects
      .toThrow(`Failed to execute translation strategy: ${originalError.message}`);
  });
});
