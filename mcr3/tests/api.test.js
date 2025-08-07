const WebSocketHandler = require('../src/api/websocketHandler');

// Mock the MCRService
const mockMcrService = {
  listStrategies: jest.fn(),
  getActiveStrategy: jest.fn(),
  setActiveStrategy: jest.fn(),
};

// Mock WebSocket
const mockWs = {
  send: jest.fn(),
  on: jest.fn(),
};

describe('WebSocketHandler API', () => {
  let webSocketHandler;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    webSocketHandler = new WebSocketHandler(mockMcrService);
  });

  test('should handle strategy.list', async () => {
    const message = {
      type: 'tool_invoke',
      messageId: '123',
      payload: { tool_name: 'strategy.list' },
    };
    mockMcrService.listStrategies.mockReturnValue([{ name: 'test-strategy', description: 'A test strategy' }]);

    await webSocketHandler.handleMessage(mockWs, JSON.stringify(message));

    expect(mockMcrService.listStrategies).toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'tool_result',
      messageId: '123',
      payload: [{ name: 'test-strategy', description: 'A test strategy' }],
    }));
  });

  test('should handle strategy.getActive', async () => {
    const message = {
      type: 'tool_invoke',
      messageId: '456',
      payload: { tool_name: 'strategy.getActive' },
    };
    mockMcrService.getActiveStrategy.mockReturnValue({ name: 'active-strategy', description: 'The active one' });

    await webSocketHandler.handleMessage(mockWs, JSON.stringify(message));

    expect(mockMcrService.getActiveStrategy).toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'tool_result',
      messageId: '456',
      payload: { name: 'active-strategy', description: 'The active one' },
    }));
  });

  test('should handle strategy.setActive', async () => {
    const message = {
      type: 'tool_invoke',
      messageId: '789',
      payload: {
        tool_name: 'strategy.setActive',
        input: { name: 'new-active-strategy' },
      },
    };
    mockMcrService.setActiveStrategy.mockReturnValue({ success: true, activeStrategy: 'new-active-strategy' });

    await webSocketHandler.handleMessage(mockWs, JSON.stringify(message));

    expect(mockMcrService.setActiveStrategy).toHaveBeenCalledWith('new-active-strategy');
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'tool_result',
      messageId: '789',
      payload: { success: true, activeStrategy: 'new-active-strategy' },
    }));
  });
});
