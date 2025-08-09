const createAssertAndQueryStrategy = require('../../strategies/nl-assert-and-query');
const { createMockLlm } = require('../testUtils');

describe('NL Assert and Query Strategy', () => {
  it('should translate a conditional question into a JSON object with assertion and query parts', async () => {
    // Arrange
    const expectedJson = {
      assertion: "man('Socrates').",
      query: "mortal('Socrates').",
    };
    // The JsonOutputParser will be tested by this. We just need the LLM to return the string representation.
    const mockLLM = createMockLlm(JSON.stringify(expectedJson));
    const strategy = createAssertAndQueryStrategy(mockLLM);
    const input = 'If Socrates is a man, is he mortal?';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toEqual(expectedJson);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });

  it('should handle a more complex assertion (a rule)', async () => {
    // Arrange
    const expectedJson = {
      assertion: 'mortal(X) :- man(X).',
      query: "mortal('Socrates').",
    };
    const mockLLM = createMockLlm(JSON.stringify(expectedJson));
    const strategy = createAssertAndQueryStrategy(mockLLM);
    const input = 'Assuming that all men are mortal, is Socrates mortal?';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toEqual(expectedJson);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
