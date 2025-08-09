const createNlToMultiFactStrategy = require('../../strategies/nl-to-multi-fact');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { AIMessage } = require('@langchain/core/messages');

// A more realistic mock LLM that behaves like a LangChain runnable
const mockLlm = {
  invoke: jest.fn(),
  pipe: jest.fn().mockReturnThis(),
  withConfig: jest.fn().mockReturnThis(),
};

describe('NL-to-Multi-Fact Strategy', () => {
  let strategy;

  beforeEach(() => {
    mockLlm.invoke.mockClear();
    strategy = createNlToMultiFactStrategy(mockLlm);
  });

  it('should have the correct name and description', () => {
    expect(strategy.name).toBe('nl-to-multi-fact');
    expect(strategy.description).toBeDefined();
  });

  it('should create a chain with a JsonOutputParser', () => {
    expect(strategy.first).toBeInstanceOf(PromptTemplate);
    expect(strategy.last).toBeInstanceOf(JsonOutputParser);
  });

  it('should return the parsed JSON object from the LLM', async () => {
    const statement = "Adam is a man and Eve is a woman.";
    const mockResponse = { facts: ["man('Adam').", "woman('Eve')."] };
    // The LLM is expected to return a string that can be parsed as JSON.
    // The JsonOutputParser expects this string to be in the `content` of an AIMessage.
    mockLlm.invoke.mockResolvedValue(new AIMessage(JSON.stringify(mockResponse)));

    const result = await strategy.invoke({ input: statement });

    expect(result).toEqual(mockResponse);
  });
});
