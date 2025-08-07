/**
 * Manages translation strategies.
 * For now, it provides a single, hardcoded "passthrough" strategy.
 */
class StrategyManager {
  constructor() {
    this.strategies = {
      passthrough: {
        name: 'passthrough',
        description: 'Assumes the input is already valid Prolog.',
        execute: (input) => Promise.resolve(input), // Simply returns the input
      },
    };
    this.activeStrategy = 'passthrough';
    console.log('StrategyManager initialized');
  }

  /**
   * Gets the active translation strategy.
   * @returns {object} The active strategy object.
   */
  getActiveStrategy() {
    return this.strategies[this.activeStrategy];
  }
}

module.exports = StrategyManager;
