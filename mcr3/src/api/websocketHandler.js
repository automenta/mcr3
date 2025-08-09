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

  async handleMessage(ws, message) {
    try {
      const parsedMessage = JSON.parse(message);
      console.log('Received message:', parsedMessage);

      if (parsedMessage.type !== 'tool_invoke') {
        throw new Error('Invalid message type');
      }

      const { tool_name, input } = parsedMessage.payload;
      let result;

      switch (tool_name) {
        case 'session.create':
          // createSession is now async because it seeds the KB
          const sessionId = await this.mcrService.createSession();
          result = { success: true, sessionId };
          break;
        case 'session.assert':
          result = await this.mcrService.assert(input.sessionId, input.naturalLanguageInput, input.strategyName);
          break;
        case 'session.query':
          result = await this.mcrService.query(input.sessionId, input.naturalLanguageInput, input.strategyName);
          break;
        case 'session.explain':
          result = await this.mcrService.explain(input.sessionId, input.prologRule);
          break;
        case 'session.get_kb':
          result = this.mcrService.getKnowledgeBase(input.sessionId);
          break;
        case 'session.critiqueAndRefine':
          result = await this.mcrService.critiqueAndRefine(input.sessionId, input.naturalLanguageInput, input.strategyName);
          break;
        case 'strategy.list':
          result = this.mcrService.listStrategies();
          break;
        case 'strategy.setActive':
          result = this.mcrService.setActiveStrategy(input.name);
          break;
        case 'strategy.getActive':
          result = this.mcrService.getActiveStrategy();
          break;

        // LLM Configuration Tools
        case 'llm.getProviders':
          result = this.mcrService.getAvailableLlmProviders();
          break;
        case 'llm.getConfig':
          result = this.mcrService.getLlmConfig();
          break;
        case 'llm.setConfig':
          result = await this.mcrService.setLlmConfig(input);
          break;

        default:
          result = { success: false, error: `Unknown tool: ${tool_name}` };
      }

      ws.send(JSON.stringify({
        type: 'tool_result',
        messageId: parsedMessage.messageId,
        payload: result
      }));

    } catch (error) {
      console.error(`Failed to handle message: ${JSON.stringify(message, null, 2)}`, error);
      // Echo back the messageId if it exists, for better client-side tracking.
      const messageId = message.messageId || null;
      ws.send(JSON.stringify({ type: 'tool_result', messageId, payload: { success: false, error: error.message || 'An unexpected error occurred.' } }));
    }
  }

  handleClose(ws) {
    console.log('Client disconnected from WebSocketHandler');
  }
}

module.exports = WebSocketHandler;
