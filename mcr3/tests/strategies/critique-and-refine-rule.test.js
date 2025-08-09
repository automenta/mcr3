const createCritiqueAndRefineRuleStrategy = require('../../strategies/critique-and-refine-rule');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { AIMessage } = require('@langchain/core/messages');

// A more realistic mock LLM that behaves like a LangChain runnable
const mockLlm = {
  invoke: jest.fn(),
  pipe: jest.fn().mockReturnThis(),
  withConfig: jest.fn().mockReturnThis(),
};

describe('Critique-and-Refine-Rule Strategy', () => {
  let strategy;

  beforeEach(() => {
    mockLlm.invoke.mockClear();
    strategy = createCritiqueAndRefineRuleStrategy(mockLlm);
  });

  it('should have the correct name and description', () => {
    expect(strategy.name).toBe('critique-and-refine-rule');
    expect(strategy.description).toBeDefined();
  });

  it('should create a valid LangChain runnable sequence', () => {
    expect(strategy.first).toBeInstanceOf(PromptTemplate);
    expect(strategy.last).toBeInstanceOf(StringOutputParser);
  });

  it('should correctly format the prompt for a given input', async () => {
    const rule = "sibling(X, Y) :- parent(Z, X), parent(Z, Y).";
    const refinedRule = "sibling(X, Y) :- parent(Z, X), parent(Z, Y), X \\= Y.";
    mockLlm.invoke.mockResolvedValue(new AIMessage(refinedRule));

    const result = await strategy.invoke({ input: rule });

    const capturedPrompt = mockLlm.invoke.mock.calls[0][0];
    expect(capturedPrompt.input).toContain(rule);
    expect(capturedPrompt.template).toContain("Analyze, critique, and refine the following Prolog rule.");

    expect(result).toBe(refinedRule);
  });
});
