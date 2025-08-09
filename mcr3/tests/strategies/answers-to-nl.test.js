const createAnswersToNlStrategy = require('../../strategies/answers-to-nl');
const { createMockLlm } = require('../testUtils');

describe('Answers to NL Strategy', () => {
  it('should translate a list of answers to a natural language sentence', async () => {
    // Arrange
    const expectedNl = "The children of John are Mary and Peter.";
    const mockLLM = createMockLlm(expectedNl);
    const strategy = createAnswersToNlStrategy(mockLLM);
    const query = "Who are the children of John?";
    const answers = "[{X: 'Mary'}, {X: 'Peter'}]";

    // Act
    const result = await strategy.invoke({ query, answers });

    // Assert
    expect(result).toBe(expectedNl);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
