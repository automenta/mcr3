const blessed = require('neo-blessed');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// --- Basic setup ---
const screen = blessed.screen({
  smartCSR: true,
  title: 'MCR3 TUI Client',
});

// --- WebSocket Client ---
const ws = new WebSocket('ws://localhost:8080/ws');
let sessionId = null;
const messageStore = new Map(); // To correlate requests with responses

// --- UI Components ---

// Title Box
const titleBox = blessed.box({
  parent: screen,
  top: 0,
  left: 'center',
  width: '100%',
  height: 1,
  content: '{bold}MCR3 TUI Client{/} | Commands: /assert <fact>, /query <question>, /kb, /quit',
  tags: true,
});

// Main Log for conversation
const mainLog = blessed.log({
  parent: screen,
  top: 1,
  left: 0,
  width: '70%',
  height: '90%-1',
  border: 'line',
  label: 'Conversation Log',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    style: { bg: 'yellow' },
  },
});

// Knowledge Base display
const kbBox = blessed.box({
  parent: screen,
  top: 1,
  right: 0,
  width: '30%',
  height: '90%-1',
  border: 'line',
  label: 'Knowledge Base',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    style: { bg: 'blue' },
  },
});

// Input box for user commands
const inputBox = blessed.textbox({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 1,
  bg: 'blue',
  inputOnFocus: true,
});

// --- Helper Functions ---
function log(message) {
  mainLog.log(message);
  screen.render();
}

function updateKb(content) {
  kbBox.setContent(content);
  screen.render();
}

function sendMessage(tool_name, input) {
  const messageId = uuidv4();
  const message = {
    type: 'tool_invoke',
    messageId,
    payload: { tool_name, input },
  };
  ws.send(JSON.stringify(message));
  messageStore.set(messageId, { tool_name, input });
}

// --- WebSocket Event Handlers ---
ws.on('open', () => {
  log('{green-fg}Connected to MCR server.{/}');
  log('Creating new session...');
  sendMessage('session.create', {});
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.type === 'system') {
    log(`{cyan-fg}[SYSTEM] ${response.message}{/}`);
    return;
  }

  if (response.type === 'tool_result') {
    const { messageId, payload } = response;
    const originalRequest = messageStore.get(messageId);

    if (originalRequest) {
      const { tool_name } = originalRequest;
      if (payload.success) {
        log(`{green-fg}Response for ${tool_name}:{/}`);
        if (tool_name === 'session.create') {
          sessionId = payload.sessionId;
          log(`  Session created: ${sessionId}`);
          sendMessage('session.get_kb', { sessionId }); // Initial KB load
        } else if (tool_name === 'session.assert') {
          log(`  Asserted: ${payload.asserted}`);
          sendMessage('session.get_kb', { sessionId }); // Refresh KB view
        } else if (tool_name === 'session.query') {
          log(`  Answer: ${payload.answer}`);
        } else if (tool_name === 'session.get_kb') {
          updateKb(payload.kb);
        } else {
          log(`  ${JSON.stringify(payload, null, 2)}`);
        }
      } else {
        log(`{red-fg}Error for ${tool_name}: ${payload.error}{/}`);
      }
    } else {
        log(`{yellow-fg}Received uncorrelated message: ${JSON.stringify(response, null, 2)}{/}`);
    }
  }
});

ws.on('close', () => {
  log('{red-fg}Disconnected from MCR server.{/}');
  return process.exit(0);
});

ws.on('error', (error) => {
  log(`{red-fg}WebSocket Error: ${error.message}{/}`);
  return process.exit(1);
});

// --- User Input Handling ---
inputBox.on('submit', (text) => {
  if (!sessionId) {
    log('{yellow-fg}Not connected to a session yet. Please wait.{/}');
    inputBox.clearValue();
    return;
  }

  log(`{blue-fg}YOU: ${text}{/}`);
  const [command, ...args] = text.trim().split(' ');
  const restOfText = args.join(' ');

  switch (command.toLowerCase()) {
    case '/assert':
      sendMessage('session.assert', { sessionId, naturalLanguageInput: restOfText });
      break;
    case '/query':
      sendMessage('session.query', { sessionId, naturalLanguageInput: restOfText });
      break;
    case '/kb':
      sendMessage('session.get_kb', { sessionId });
      break;
    case '/quit':
      ws.close();
      break;
    default:
      log('{yellow-fg}Unknown command. Available: /assert, /query, /kb, /quit{/}');
  }

  inputBox.clearValue();
  inputBox.focus();
  screen.render();
});

// --- Global Key Handlers ---
screen.key(['escape', 'q', 'C-c'], () => {
  ws.close();
});

// --- Initial setup ---
inputBox.focus();
screen.render();
