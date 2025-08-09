const fs = require('fs');
const path = require('path');
const { StrategyLoadError, StrategyNotFoundError } = require('../errors');

/**
 * Manages the loading and retrieval of translation strategies.
 */
class StrategyManager {
  constructor(initialLlm, { specificFiles = null } = {}) {
    this.strategies = new Map();
    this.activeStrategyName = null;
    this.llm = initialLlm;
    this.loadStrategies(specificFiles);
  }

  rebuildStrategies(newLlm) {
    console.log('Rebuilding strategies with new LLM instance.');
    this.llm = newLlm;
    this.strategies.clear();
    this.activeStrategyName = null;
    this.loadStrategies();
  }

  loadStrategies(specificFiles = null) {
    const strategiesDir = path.join(__dirname, '..', '..', 'strategies');
    if (!fs.existsSync(strategiesDir)) {
      console.warn('Strategies directory not found. No strategies loaded.');
      return;
    }

    const strategyFiles = specificFiles || fs.readdirSync(strategiesDir).filter(file => file.endsWith('.js'));

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

        if (!this.activeStrategyName) {
          this.activeStrategyName = strategy.name;
          console.log(`Set default active strategy to: ${strategy.name}`);
        }
      } catch (error) {
        // Wrap the original error in our custom error type for better context.
        throw new StrategyLoadError(file, error);
      }
    }
  }

  listStrategies() {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      description: s.description,
    }));
  }

  setActiveStrategy(name) {
    if (!this.strategies.has(name)) {
      throw new StrategyNotFoundError(name);
    }
    this.activeStrategyName = name;
    console.log(`Active strategy set to: ${name}`);
    return true;
  }

  getActiveStrategy() {
    if (!this.activeStrategyName) {
      return undefined;
    }
    return this.getStrategy(this.activeStrategyName);
  }

  getStrategy(name) {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new StrategyNotFoundError(name);
    }
    return strategy;
  }
}

module.exports = StrategyManager;
