/**
 * The Strategy Executor is responsible for running translation strategies.
 * It takes a LangChain runnable (the strategy) and an input, invokes the chain,
 * and handles any errors that occur during execution.
 */
class StrategyExecutor {
  constructor() {
    console.log('StrategyExecutor initialized');
  }

  /**
   * Executes a given translation strategy.
   * @param {object} strategy - A LangChain runnable (e.g., a chain).
   * @param {object} inputs - The key-value inputs for the chain.
   * @returns {Promise<string>} The output of the strategy execution.
   * @throws {Error} If the strategy execution fails.
   */
  async execute(strategy, inputs) {
    if (!strategy || typeof strategy.invoke !== 'function') {
      throw new Error('Invalid strategy provided. Must be a LangChain runnable.');
    }

    try {
      console.log(`Executing strategy with inputs:`, inputs);
      const result = await strategy.invoke(inputs);
      // Assuming the final output of the chain is a string (e.g., from an OutputParser)
      // LangChain can return complex objects, but for NL->Prolog, we expect a string.
      const output = typeof result === 'string' ? result : result.content;
      console.log('Strategy execution successful, output:', output);
      return output;
    } catch (error) {
      console.error('Strategy execution failed:', error);
      // Re-throw a more specific error to be handled by the calling service.
      throw new Error(`Failed to execute translation strategy: ${error.message}`);
    }
  }
}

module.exports = StrategyExecutor;
