/**
 * Handles WebSocket connections and routes messages to the appropriate services.
 */
class WebSocketHandler {
  constructor(mcrService) {
    this.mcrService = mcrService;
  }

  handleConnection(ws) {
    ws.correlationId = uuidv4();
    console.log(`Client connected with correlationId: ${ws.correlationId}`);

    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleClose(ws));

    ws.send(JSON.stringify({
        type: 'connection_ack',
        correlationId: ws.correlationId,
        message: 'WebSocket connection established with MCR3 server.'
    }));
  }

  async handleMessage(ws, message) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
      // Basic message validation
      if (parsedMessage.type !== 'tool_invoke' || !parsedMessage.messageId || !parsedMessage.payload?.tool_name) {
          throw new Error('Invalid message format. Must be a `tool_invoke` with `messageId` and `payload.tool_name`.');
      }
      console.log(`[${ws.correlationId}] Received message:`, parsedMessage);

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
        case 'session.get_kb':
          result = this.mcrService.getKnowledgeBase(input.sessionId);
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
        case 'session.explain':
            result = await this.mcrService.explain(input.sessionId, input.prologRule);
            break;
        case 'session.critiqueAndRefine':
            result = await this.mcrService.critiqueAndRefine(input.sessionId, input.naturalLanguageInput);
            break;
        default:
          throw new Error(`Unknown tool: ${tool_name}`);
      }

      ws.send(JSON.stringify({
        type: 'tool_result',
        messageId: parsedMessage.messageId,
        correlationId: ws.correlationId,
        payload: result
      }));

    } catch (error) {
        const messageId = parsedMessage ? parsedMessage.messageId : null;
        console.error(`[${ws.correlationId}] Failed to handle message:`, error);
        ws.send(JSON.stringify({
            type: 'tool_result',
            messageId,
            correlationId: ws.correlationId,
            payload: {
                success: false,
                error: 'TOOL_EXECUTION_ERROR',
                details: error.message || 'An unexpected error occurred.'
            }
        }));
    }
  }

  handleClose(ws) {
    console.log('Client disconnected from WebSocketHandler');
  }
}

module.exports = WebSocketHandler;
