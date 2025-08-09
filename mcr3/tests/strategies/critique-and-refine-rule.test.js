const createCritiqueAndRefineRuleStrategy = require('../../strategies/critique-and-refine-rule');
const { createMockLlm } = require('../testUtils');

describe('Critique and Refine Rule Strategy', () => {
  it('should refine a rule to make it more correct', async () => {
    // Arrange
    const expectedRefinedRule = 'sibling(X, Y) :- parent(Z, X), parent(Z, Y), X \\= Y.';
    const mockLLM = createMockLlm(expectedRefinedRule);
    const strategy = createCritiqueAndRefineRuleStrategy(mockLLM);
    const rule = 'sibling(X, Y) :- parent(Z, X), parent(Z, Y).';

    // Act
    const result = await strategy.invoke({ input: rule });

    // Assert
    expect(result).toBe(expectedRefinedRule);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
