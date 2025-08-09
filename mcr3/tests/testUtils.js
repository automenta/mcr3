const { AIMessage } = require('@langchain/core/messages');

const createMockLlm = (output) => ({
  invoke: jest.fn().mockResolvedValue(new AIMessage(output)),
  pipe: jest.fn().mockReturnThis(),
});

module.exports = {
  createMockLlm,
};
