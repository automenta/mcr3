const createNlToConditionalRuleStrategy = require('../../strategies/nl-to-conditional-rule');
const { createMockLlm } = require('../testUtils');

describe('NL to Conditional Rule Strategy', () => {
  it('should translate a simple conditional statement to a Prolog rule', async () => {
    // Arrange
    const expectedRule = 'animal(X) :- cat(X).';
    const mockLLM = createMockLlm(expectedRule);
    const strategy = createNlToConditionalRuleStrategy(mockLLM);
    const input = 'If X is a cat, then X is an animal.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedRule);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
