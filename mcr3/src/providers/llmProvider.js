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
 * Creates and returns an instance of the configured LLM provider.
 *
 * @returns {object} An instance of a LangChain chat model.
 * @throws {Error} If the configured provider is invalid or missing required configuration.
 */
function getLlm() {
  const providerName = process.env.MCR_LLM_PROVIDER?.toLowerCase();
  const LlmClass = providerMap[providerName];

  if (!LlmClass) {
    throw new Error(`Invalid or unspecified LLM provider: '${providerName}'. Check MCR_LLM_PROVIDER environment variable.`);
  }

  console.log(`Initializing LLM provider: ${providerName}`);

  // Configuration options are passed directly to the constructor.
  // LangChain classes are designed to pick up credentials from environment
  // variables (e.g., OPENAI_API_KEY, GOOGLE_API_KEY).
  const config = {};
  if (providerName === 'ollama') {
    config.baseUrl = process.env.OLLAMA_BASE_URL;
  }
  // For OpenAI-compatible endpoints, users can set OPENAI_API_BASE
  if (providerName === 'openai' && process.env.OPENAI_API_BASE) {
    config.baseURL = process.env.OPENAI_API_BASE;
  }

  return new LlmClass(config);
}

module.exports = { getLlm };
