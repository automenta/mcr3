const StrategyExecutor = require('../src/services/strategyExecutor');
const { StrategyExecutionError } = require('../src/errors');

describe('StrategyExecutor', () => {
  let executor;
  let mockStrategy;

  beforeEach(() => {
    executor = new StrategyExecutor();
    mockStrategy = {
      name: 'mock-strategy',
      invoke: jest.fn(),
    };
  });

  it('should execute a valid strategy and return the result', async () => {
    const inputs = { query: 'test' };
    const expectedResult = 'success';
    mockStrategy.invoke.mockResolvedValue(expectedResult);

    const result = await executor.execute(mockStrategy, inputs);

    expect(mockStrategy.invoke).toHaveBeenCalledWith(inputs);
    expect(result).toBe(expectedResult);
  });

  it('should handle strategy output as a content object', async () => {
    const inputs = { query: 'test' };
    const expectedResult = { content: 'success' };
    mockStrategy.invoke.mockResolvedValue(expectedResult);

    const result = await executor.execute(mockStrategy, inputs);

    expect(result).toEqual(expectedResult);
  });

  it('should throw an error if the strategy is not a valid runnable', async () => {
    const invalidStrategy = {}; // No invoke method or name
    await expect(executor.execute(invalidStrategy, {})).rejects.toThrow(
      'Invalid strategy provided. Must be a LangChain runnable with a name.'
    );
  });

  it('should re-throw a specific error if strategy execution fails', async () => {
    const error = new Error('LLM call failed');
    mockStrategy.invoke.mockRejectedValue(error);

    await expect(executor.execute(mockStrategy, {})).rejects.toThrow(StrategyExecutionError);
  });
});
