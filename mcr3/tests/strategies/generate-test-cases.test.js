const createGenerateTestCasesStrategy = require('../../strategies/generate-test-cases');
const { createMockLlm } = require('../testUtils');

describe('Generate Test Cases Strategy', () => {
  it('should generate a valid JSON object with test cases', async () => {
    // Arrange
    const expectedJson = {
      setup: [
        "John is the parent of Mary.",
        "Mary is the parent of Peter."
      ],
      assertions: [
        { query: "Is John the grandparent of Peter?", expected: "Yes" },
        { query: "Is Mary the grandparent of John?", expected: "No" }
      ]
    };
    const mockLLM = createMockLlm(JSON.stringify(expectedJson));
    const strategy = createGenerateTestCasesStrategy(mockLLM);
    const rule = 'grandparent(X, Z) :- parent(X, Y), parent(Y, Z).';

    // Act
    const result = await strategy.invoke({ rule });

    // Assert
    expect(result).toEqual(expectedJson);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
