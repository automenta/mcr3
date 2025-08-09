const createFactToNlStrategy = require('../../strategies/fact-to-nl');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { AIMessage } = require('@langchain/core/messages');

// A more realistic mock LLM that behaves like a LangChain runnable
const mockLlm = {
  invoke: jest.fn(),
  pipe: jest.fn().mockReturnThis(),
  withConfig: jest.fn().mockReturnThis(),
};

describe('Fact-to-NL Strategy', () => {
  let strategy;

  beforeEach(() => {
    mockLlm.invoke.mockClear();
    strategy = createFactToNlStrategy(mockLlm);
  });

  it('should have the correct name and description', () => {
    expect(strategy.name).toBe('fact-to-nl');
    expect(strategy.description).toBeDefined();
  });

  it('should create a valid LangChain runnable sequence', () => {
    expect(strategy.first).toBeInstanceOf(PromptTemplate);
    expect(strategy.last).toBeInstanceOf(StringOutputParser);
  });

  it('should correctly format the prompt for a given input', async () => {
    const fact = "father_of('Adam', 'Cain').";
    const expectedOutput = "Adam is the father of Cain.";
    // Mock the LLM to return an AIMessage, which is what the real LLM would do.
    mockLlm.invoke.mockResolvedValue(new AIMessage(expectedOutput));

    const result = await strategy.invoke({ input: fact });

    // Verify the prompt that was passed to the LLM
    const capturedPrompt = mockLlm.invoke.mock.calls[0][0];
    expect(capturedPrompt.input).toContain(fact);
    expect(capturedPrompt.template).toContain("Translate the following Prolog fact into a natural language sentence:");

    // The StringOutputParser will extract the content from the AIMessage.
    expect(result).toBe(expectedOutput);
  });
});
