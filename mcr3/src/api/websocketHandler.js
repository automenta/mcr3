/**
 * Handles WebSocket connections and routes messages to the appropriate services.
 */
class WebSocketHandler {
  constructor(mcrService) {
    this.mcrService = mcrService;
  }

  handleConnection(ws) {
    console.log('Client connected to WebSocketHandler');

    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleClose(ws));

    ws.send(JSON.stringify({ type: 'system', message: 'Welcome to MCR3 WebSocket API' }));
  }

  handleMessage(ws, message) {
    try {
      const parsedMessage = JSON.parse(message);
      console.log('Received message:', parsedMessage);

      // Simple echo for now, will be replaced with tool routing
      ws.send(JSON.stringify({
        type: 'tool_result',
        messageId: parsedMessage.messageId || null,
        payload: {
          success: true,
          data: `Echo: ${parsedMessage.payload.input.content}`
        }
      }));

    } catch (error) {
      console.error('Failed to handle message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  handleClose(ws) {
    console.log('Client disconnected from WebSocketHandler');
  }
}

module.exports = WebSocketHandler;
