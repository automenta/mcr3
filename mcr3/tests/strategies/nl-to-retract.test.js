const createNlToRetractStrategy = require('../../strategies/nl-to-retract');
const { createMockLlm } = require('../testUtils');

describe('NL to Retract Strategy', () => {
  it('should translate a command to retract a simple fact', async () => {
    // Arrange
    const expectedOutput = "retract(man('Socrates')).";
    const mockLLM = createMockLlm(expectedOutput);
    const strategy = createNlToRetractStrategy(mockLLM);
    const input = 'Forget that Socrates is a man.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedOutput);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });

  it('should translate a command to retract a rule', async () => {
    // Arrange
    const expectedOutput = 'retract((mortal(X) :- man(X))).';
    const mockLLM = createMockLlm(expectedOutput);
    const strategy = createNlToRetractStrategy(mockLLM);
    const input = 'Remove the rule that all men are mortal.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedOutput);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });

  it('should translate a command to use retractall for a general case', async () => {
    // Arrange
    const expectedOutput = 'retractall(human(_)).';
    const mockLLM = createMockLlm(expectedOutput);
    const strategy = createNlToRetractStrategy(mockLLM);
    const input = 'Remove all human facts.';

    // Act
    const result = await strategy.invoke({ input });

    // Assert
    expect(result).toBe(expectedOutput);
    expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
  });
});
