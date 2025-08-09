const { ChatOpenAI } = require('@langchain/openai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatOllama } = require('@langchain/community/chat_models/ollama');

/**
 * LLM Provider Factory
 *
 * This module acts as a factory to instantiate the correct LLM provider based on
 * environment variables. This makes the application modular and easy to configure
 * for different LLM backends.
 */

// Mapping of provider names to their corresponding classes
const providerMap = {
  openai: ChatOpenAI,
  gemini: ChatGoogleGenerativeAI,
  ollama: ChatOllama,
};

/**
 * Creates and returns an instance of a specified LLM provider.
 *
 * @param {string} providerName - The name of the provider (e.g., 'openai', 'gemini').
 * @param {object} options - Configuration options for the provider.
 *                           For 'openai', this can include `apiKey`, `baseURL`.
 *                           For 'gemini', this can include `apiKey`.
 *                           For 'ollama', this can include `baseUrl`, `model`.
 * @returns {object} An instance of a LangChain chat model.
 * @throws {Error} If the provider is invalid or required options are missing.
 */
function createLlm(providerName, options = {}) {
  const LlmClass = providerMap[providerName?.toLowerCase()];

  if (!LlmClass) {
    throw new Error(`Invalid LLM provider specified: '${providerName}'.`);
  }

  console.log(`Creating LLM instance for provider: ${providerName}`);

  // Start with base configuration from provided options
  const config = { ...options };

  // LangChain classes are designed to also pick up credentials from environment
  // variables if not provided in the config object. We will rely on that as a fallback.
  // Example: new ChatOpenAI({ apiKey: '...' }) or just new ChatOpenAI() if OPENAI_API_KEY is set.

  const llm = new LlmClass(config);

  // Add a retry mechanism for common transient network errors.
  // This will retry up to 2 times (3 total attempts) if the LLM API
  // returns one of these specific HTTP status codes.
  return llm.withRetry({
    stopAfterAttempt: 3,
    retryOn: (err) => {
      const transientErrorCodes = [429, 502, 503, 504];
      return err.status && transientErrorCodes.includes(err.status);
    },
  });
}

/**
 * Returns a list of available LLM provider names.
 * @returns {string[]}
 */
function getAvailableProviders() {
    return Object.keys(providerMap);
}


module.exports = { createLlm, getAvailableProviders };
