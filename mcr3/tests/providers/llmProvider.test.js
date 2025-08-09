const { createLlm } = require('../../src/providers/llmProvider');
const { ChatOpenAI } = require('@langchain/openai');

// Mock the invoke method on the prototype. This is a more robust way to test
// since we don't have to worry about mocking withRetry. The real withRetry
// will end up calling our mocked invoke method.
const mockInvoke = jest.fn();
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockInvoke,
    withRetry: jest.requireActual('@langchain/openai').ChatOpenAI.prototype.withRetry,
  })),
}));

describe('LLM Provider', () => {
  beforeEach(() => {
    // Clear mock history before each test
    ChatOpenAI.mockClear();
    mockInvoke.mockClear();
  });

  it('should create an OpenAI instance', () => {
    createLlm('openai');
    expect(ChatOpenAI).toHaveBeenCalledTimes(1);
  });

  it('should throw an error for an invalid provider', () => {
    expect(() => createLlm('invalid-provider')).toThrow('Invalid LLM provider specified');
  });

  describe('Retry Logic', () => {
    it('should retry on transient errors and eventually succeed', async () => {
      // Arrange
      const transientError = new Error('Too Many Requests');
      transientError.status = 429;
      const successResponse = { content: 'Success!' };

      // Fail on the first two calls, succeed on the third
      mockInvoke
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce(successResponse);

      // Act
      const llm = createLlm('openai');
      const result = await llm.invoke('test prompt');

      // Assert
      expect(result).toBe(successResponse);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should fail after the final attempt', async () => {
        // Arrange
        const transientError = new Error('Too Many Requests');
        transientError.status = 429;

        // Fail on all three calls
        mockInvoke.mockRejectedValue(transientError);

        const llm = createLlm('openai');

        // Act & Assert
        await expect(llm.invoke('test prompt')).rejects.toThrow(transientError);
        expect(mockInvoke).toHaveBeenCalledTimes(3);
      });
  });
});
