const createNlToMultiRuleStrategy = require('../../strategies/nl-to-multi-rule');
const { createMockLlm } = require('../testUtils');

describe('NL to Multi-Rule Strategy', () => {
  it('should translate a statement with "or" into two separate rules', async () => {
    // Arrange
    const expectedRules = 'happy(X) :- rich(X).\nhappy(X) :- famous(X).';
    const mockLLM = createMockLlm(expectedRules);
    const strategy = createNlToMultiRuleStrategy(mockLLM);
    const input = 'A person is happy if they are rich or famous.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedRules);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });

  it('should translate two separate sentences into two rules', async () => {
    // Arrange
    const expectedRules = 'city(X) :- in_usa(X), has_large_population(X).\ncity(X) :- capital_of_country(X, _).';
    const mockLLM = createMockLlm(expectedRules);
    const strategy = createNlToMultiRuleStrategy(mockLLM);
    const input = 'A location is a city if it is in the USA and has a large population. A location is also a city if it is the capital of a country.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedRules);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
