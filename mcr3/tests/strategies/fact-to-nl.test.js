const createFactToNlStrategy = require('../../strategies/fact-to-nl');
const { createMockLlm } = require('../testUtils');

describe('Fact to NL Strategy', () => {
  it('should translate a simple fact to a natural language sentence', async () => {
    // Arrange
    const expectedNl = "Socrates is a man.";
    const mockLLM = createMockLlm(expectedNl);
    const strategy = createFactToNlStrategy(mockLLM);
    const fact = "man('Socrates').";

    // Act
    const result = await strategy.invoke({ input: fact });

    // Assert
    expect(result).toBe(expectedNl);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
