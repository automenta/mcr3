const { StrategyExecutionError } = require('../errors');

/**
 * The Strategy Executor is responsible for running translation strategies.
 */
class StrategyExecutor {
  constructor() {
    console.log('StrategyExecutor initialized');
  }

  /**
   * Executes a given translation strategy.
   * @param {object} strategy - A LangChain runnable with a 'name' property.
   * @param {object} inputs - The key-value inputs for the chain.
   * @returns {Promise<any>} The output of the strategy execution.
   * @throws {StrategyExecutionError} If the strategy execution fails.
   */
  async execute(strategy, inputs) {
    if (!strategy || typeof strategy.invoke !== 'function' || !strategy.name) {
      throw new Error('Invalid strategy provided. Must be a LangChain runnable with a name.');
    }

    try {
      console.log(`Executing strategy "${strategy.name}" with inputs:`, inputs);
      const result = await strategy.invoke(inputs);

      // LangChain can return complex objects. The output parser of the strategy
      // is responsible for shaping the final result. We return it as is.
      console.log(`Strategy "${strategy.name}" execution successful.`);
      return result;
    } catch (error) {
      console.error(`Strategy "${strategy.name}" execution failed:`, error);
      // Wrap the original error in our custom error type for better context.
      throw new StrategyExecutionError(strategy.name, error);
    }
  }
}

module.exports = StrategyExecutor;
