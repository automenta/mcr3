const fs = require('fs');
const path = require('path');
const { getLlm } = require('../providers/llmProvider');

/**
 * Manages the loading and retrieval of translation strategies.
 *
 * This service dynamically loads strategy modules from the `../strategies` directory.
 * Each strategy module is expected to be a function that accepts an LLM instance
 * and returns a LangChain runnable. This allows strategies to be self-contained
 * and easily added or removed.
 */
class StrategyManager {
  constructor() {
    this.strategies = new Map();
    this.activeStrategyName = null;
    this.llm = getLlm(); // Get the singleton LLM instance
    this.loadStrategies();
  }

  /**
   * Loads all strategy modules from the strategies directory.
   */
  loadStrategies() {
    const strategiesDir = path.join(__dirname, '..', 'strategies');
    if (!fs.existsSync(strategiesDir)) {
      console.warn('Strategies directory not found. No strategies loaded.');
      return;
    }

    const strategyFiles = fs.readdirSync(strategiesDir).filter(file => file.endsWith('.js'));

    for (const file of strategyFiles) {
      try {
        const strategyPath = path.join(strategiesDir, file);
        const createStrategy = require(strategyPath);

        if (typeof createStrategy !== 'function') {
          throw new Error('Module does not export a creation function.');
        }

        const strategy = createStrategy(this.llm);

        if (!strategy.name) {
          throw new Error('Strategy does not have a "name" property.');
        }

        this.strategies.set(strategy.name, strategy);
        console.log(`Successfully loaded strategy: ${strategy.name}`);

        // Set the first loaded strategy as the default active one.
        if (!this.activeStrategyName) {
          this.activeStrategyName = strategy.name;
          console.log(`Set default active strategy to: ${strategy.name}`);
        }
      } catch (error) {
        console.error(`Failed to load strategy from ${file}:`, error);
      }
    }
  }

  /**
   * Returns a list of all available strategy names and descriptions.
   * @returns {Array<object>}
   */
  listStrategies() {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * Sets the active strategy for the system.
   * @param {string} name - The name of the strategy to activate.
   * @returns {boolean} True if the strategy was found and set, false otherwise.
   */
  setActiveStrategy(name) {
    if (this.strategies.has(name)) {
      this.activeStrategyName = name;
      console.log(`Active strategy set to: ${name}`);
      return true;
    }
    console.warn(`Attempted to set unknown strategy: ${name}`);
    return false;
  }

  /**
   * Retrieves the currently active strategy object.
   * @returns {object | undefined} The active strategy runnable.
   */
  getActiveStrategy() {
    return this.strategies.get(this.activeStrategyName);
  }

  /**
   * Retrieves a strategy by its name.
   * @param {string} name - The name of the strategy to retrieve.
   * @returns {object | undefined} The strategy runnable.
   */
  getStrategy(name) {
    return this.strategies.get(name);
  }
}

module.exports = StrategyManager;
