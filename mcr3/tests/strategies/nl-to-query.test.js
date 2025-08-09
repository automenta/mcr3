const createNlToQueryStrategy = require('../../strategies/nl-to-query');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { AIMessage } = require('@langchain/core/messages');

describe('NL-to-Query Strategy', () => {
  let strategy;
  let mockLlm;

  beforeEach(() => {
    // A more realistic mock LLM that behaves like a LangChain runnable, created fresh for each test
    mockLlm = {
      invoke: jest.fn(),
      pipe: jest.fn().mockReturnThis(),
      withConfig: jest.fn().mockReturnThis(),
    };
    strategy = createNlToQueryStrategy(mockLlm);
  });

  it('should have the correct name and description', () => {
    expect(strategy.name).toBe('nl-to-query');
    expect(strategy.description).toBeDefined();
  });

  it('should create a valid LangChain runnable sequence', () => {
    expect(strategy.first).toBeInstanceOf(PromptTemplate);
    expect(strategy.last).toBeInstanceOf(StringOutputParser);
  });

  it('should correctly format the prompt for a given input', async () => {
    const question = "Who is the father of Cain?";
    const expectedOutput = "father_of(Who, 'Cain').";
    mockLlm.invoke.mockResolvedValue(new AIMessage(expectedOutput));

    const result = await strategy.invoke({ input: question });

    // Verify the prompt that was passed to the LLM
    const capturedPrompt = mockLlm.invoke.mock.calls[0][0];
    expect(capturedPrompt.input).toContain(question);
    expect(capturedPrompt.template).toContain("Translate the following question into a Prolog query:");

    // Verify the final output
    expect(result).toBe(expectedOutput);
  });
});
