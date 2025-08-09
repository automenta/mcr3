/**
 * Custom error class for failures related to loading a strategy.
 */
class StrategyLoadError extends Error {
  constructor(fileName, originalError) {
    super(`Failed to load strategy from file: ${fileName}`);
    this.name = 'StrategyLoadError';
    this.fileName = fileName;
    this.originalError = originalError; // Keep the original error for inspection
  }
}

/**
 * Custom error class for when a strategy is not found.
 */
class StrategyNotFoundError extends Error {
  constructor(strategyName) {
    super(`Strategy not found: ${strategyName}`);
    this.name = 'StrategyNotFoundError';
    this.strategyName = strategyName;
  }
}

/**
 * Custom error class for failures during strategy execution.
 */
class StrategyExecutionError extends Error {
  constructor(strategyName, originalError) {
    super(`Failed to execute strategy: ${strategyName}`);
    this.name = 'StrategyExecutionError';
    this.strategyName = strategyName;
    this.originalError = originalError;
  }
}

module.exports = {
  StrategyLoadError,
  StrategyNotFoundError,
  StrategyExecutionError,
};
