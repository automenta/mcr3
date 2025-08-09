const blessed = require('neo-blessed');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const examples = require('./examples');
const { highlight } = require('cli-highlight');
const yargsParser = require('yargs-parser');

// --- Argument Parsing ---
const argv = yargsParser(process.argv.slice(2));
const serverUrl = argv.server || 'ws://localhost:8080/ws';


// --- Basic setup ---
const screen = blessed.screen({
  smartCSR: true,
  title: 'MCR3 TUI Client',
});

// --- History Setup ---
const HISTORY_FILE = path.join(process.cwd(), '.tui_history');
let history = [];
let historyIndex = -1;

try {
  if (fs.existsSync(HISTORY_FILE)) {
    history = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
    historyIndex = history.length;
  }
} catch (e) {
  // Could log this to a debug file if needed
}


// --- WebSocket Client ---
let ws;
let sessionId = null;
let connectionStatus = 'Connecting...';
const messageStore = new Map(); // To correlate requests with responses

function connect() {
    log(`{yellow-fg}Connecting to ${serverUrl}...{/}`);
    connectionStatus = 'Connecting...';
    updateStatusBar();

    ws = new WebSocket(serverUrl);

    // Re-attach all event handlers
    ws.on('open', onWsOpen);
    ws.on('message', onWsMessage);
    ws.on('close', onWsClose);
    ws.on('error', onWsError);
}

// --- UI Components ---

// Title Box
const titleBox = blessed.box({
  parent: screen,
  top: 0,
  left: 'center',
  width: '100%',
  height: 1,
  content: '{bold}MCR3 TUI Client{/} | /help for commands | Ctrl-E for Examples',
  tags: true,
});

// --- UI Components (continued) ---

// Examples List (initially hidden)
const examplesList = blessed.list({
  parent: screen,
  label: 'Select an Example',
  left: 'center',
  top: 'center',
  width: '50%',
  height: '50%',
  items: examples.map(e => e.title),
  border: 'line',
  style: {
    selected: {
      bg: 'blue',
    },
  },
  keys: true,
  vi: true,
  mouse: true,
  hidden: true,
});


// Main Log for conversation
let logMessages = [];
let line_to_message_map = [];
const mainLog = blessed.list({
  parent: screen,
  top: 1,
  left: 0,
  width: '70%',
  height: '100%-3',
  border: 'line',
  label: 'Conversation Log',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    style: { bg: 'yellow' },
  },
  style: {
      selected: {
          bg: 'blue'
      }
  },
  keys: true,
  vi: true,
  mouse: true,
});

// Knowledge Base display
const kbBox = blessed.box({
  parent: screen,
  top: 1,
  right: 0,
  width: '30%',
  height: '100%-3',
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
  bottom: 1,
  left: 0,
  width: '100%',
  height: 1,
  bg: 'blue',
  inputOnFocus: true,
});

// Status Bar
const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: 'Disconnected',
    tags: true,
    style: {
        bg: 'gray',
    }
});


// --- Helper Functions ---
function renderLog() {
    const items = [];
    line_to_message_map = [];
    logMessages.forEach((msg, msgIndex) => {
        if (!msg.expandable) {
            items.push('    ' + msg.content);
            line_to_message_map.push(msgIndex);
        } else {
            if (msg.isExpanded) {
                items.push(`[-] ${msg.content.summary}`);
                line_to_message_map.push(msgIndex);
                const fullContentLines = msg.content.full.split('\n');
                fullContentLines.forEach(line => {
                    items.push(`      ${line}`);
                    line_to_message_map.push(msgIndex);
                });
            } else {
                items.push(`[+] ${msg.content.summary}`);
                line_to_message_map.push(msgIndex);
            }
        }
    });

    mainLog.setItems(items);
    mainLog.scrollTo(items.length);
    screen.render();
}

function log(content, type = 'info') {
    let message;
    const isExpandable = typeof content === 'object';

    if (isExpandable) {
        message = {
            content: {
                summary: content.summary,
                full: content.full,
            },
            expandable: true,
            isExpanded: false,
            type,
        };
    } else {
        message = { content, expandable: false, type };
    }
  logMessages.push(message);
  renderLog();
}

function updateKb(content) {
  const highlightedKb = highlight(content || '', { language: 'prolog', ignoreIllegals: true });
  kbBox.setContent(highlightedKb);
  screen.render();
}

function updateStatusBar() {
    const sessionInfo = sessionId ? `Session: ${sessionId}` : 'No Session';
    statusBar.setContent(`${connectionStatus} | ${sessionInfo}`);
    screen.render();
}

function saveHistory() {
    try {
        fs.writeFileSync(HISTORY_FILE, history.join('\n'));
    } catch (e) {
        // failed to save history
    }
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
function onWsOpen() {
    connectionStatus = '{green-fg}Connected{/}';
    log('{green-fg}Connected to MCR server.{/}');
    log('Creating new session...');
    sendMessage('session.create', {});
    updateStatusBar();
}

function onWsMessage(data) {
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
                log(`{green-fg}Response for ${tool_name}:{/}`, 'response');
                if (tool_name === 'session.create') {
                    sessionId = payload.sessionId;
                    log(`  Session created: ${sessionId}`);
                    sendMessage('session.get_kb', { sessionId }); // Initial KB load
                } else if (tool_name === 'session.assert') {
                    const { asserted, strategy } = payload;
                    const summary = `Asserted using ${strategy}: ${asserted}`;
                    log({ summary, full: asserted }, 'response');
                    sendMessage('session.get_kb', { sessionId });
                } else if (tool_name === 'session.query') {
                    const { answer } = payload;
                    const summary = `Answer: ${answer.substring(0, 80)}...`;
                    log({ summary, full: answer }, 'response');
                } else if (tool_name === 'session.get_kb') {
                    updateKb(payload.kb);
                } else {
                    const full = JSON.stringify(payload, null, 2);
                    const summary = `Received data for ${tool_name}`;
                    log({ summary, full }, 'response');
                }
            } else {
                const error = payload.error;
                const summary = `{red-fg}Error for ${tool_name}: ${error.substring(0,80)}...{/}`;
                log({ summary, full: error }, 'error');
            }
        } else {
            const full = JSON.stringify(response, null, 2);
            const summary = `{yellow-fg}Received uncorrelated message.{/}`;
            log({ summary, full }, 'error');
        }
        updateStatusBar();
    }
}

function onWsClose() {
    sessionId = null;
    connectionStatus = '{red-fg}Disconnected{/}';
    updateStatusBar();
    log('{red-fg}Connection closed. Attempting to reconnect in 5 seconds...{/}');
    setTimeout(connect, 5000);
}

function onWsError(error) {
    log(`{red-fg}WebSocket Error: ${error.message}. Will attempt to reconnect.{/}`, 'error');
    // The 'close' event will fire next, which will trigger reconnection.
}


mainLog.on('select', (item, index) => {
    const messageIndex = line_to_message_map[index];
    if (messageIndex === undefined) return;

    const message = logMessages[messageIndex];
    if (message && message.expandable) {
        message.isExpanded = !message.isExpanded;

        // Don't re-select, as the list content changes.
        // Let the user navigate naturally.
        renderLog();
        // Try to select the same message's first line.
        const newLineIndex = line_to_message_map.findIndex(i => i === messageIndex);
        if (newLineIndex !== -1) {
            mainLog.select(newLineIndex);
        }
        screen.render();
    }
});

// --- User Input Handling ---
const commands = {
    '/assert': {
        description: 'Assert a fact or rule in natural language. Usage: /assert <natural language statement>',
        action: (args) => sendMessage('session.assert', { sessionId, naturalLanguageInput: args }),
    },
    '/query': {
        description: 'Ask a question in natural language. Usage: /query <natural language question>',
        action: (args) => sendMessage('session.query', { sessionId, naturalLanguageInput: args }),
    },
    '/kb': {
        description: 'View the current knowledge base.',
        action: () => sendMessage('session.get_kb', { sessionId }),
    },
    '/strategy': {
        description: 'Manage strategies. Usage: /strategy list | /strategy set <name>',
        action: (args) => {
            const [subcommand, ...rest] = args.split(' ');
            if (subcommand === 'list') {
                sendMessage('strategy.list', {});
            } else if (subcommand === 'set' && rest.length > 0) {
                sendMessage('strategy.setActive', { name: rest.join(' ') });
            } else {
                log('{yellow-fg}Usage: /strategy list | /strategy set <name>{/}');
            }
        }
    },
    '/examples': {
        description: 'Show a list of example commands.',
        action: () => {
            examplesList.show();
            examplesList.focus();
        }
    },
    '/help': {
        description: 'Show this help message.',
        action: () => {
            const helpText = Object.entries(commands).map(([cmd, { description }]) => `{bold}${cmd}{/}: ${description}`).join('\n');
            log({ summary: 'Available Commands:', full: helpText });
        }
    },
    '/quit': {
        description: 'Exit the TUI.',
        action: () => {
            saveHistory();
            ws.close();
            setTimeout(() => process.exit(0), 100);
        }
    }
};


function handleCommand(text) {
    const trimmedText = text.trim();
    if (!trimmedText) {
        inputBox.clearValue();
        inputBox.focus();
        screen.render();
        return;
    }

    if (!sessionId) {
        log('{yellow-fg}Not connected to a session yet. Please wait.{/}');
        inputBox.clearValue();
        return;
    }

    log(`{blue-fg}YOU: ${text}{/}`);

    if (history[history.length - 1] !== text) {
        history.push(text);
    }
    historyIndex = history.length;

    const [command, ...args] = trimmedText.split(' ');
    const restOfText = args.join(' ');
    const commandHandler = commands[command.toLowerCase()];

    if (commandHandler) {
        commandHandler.action(restOfText);
    } else {
        log(`{yellow-fg}Unknown command. Type /help for a list of commands.{/}`);
    }

    inputBox.clearValue();
    inputBox.focus();
    screen.render();
}

inputBox.on('submit', (text) => {
    handleCommand(text);
});

inputBox.key(['up', 'down'], (ch, key) => {
    if (key.name === 'up') {
        if (historyIndex > 0) {
            historyIndex--;
            inputBox.setValue(history[historyIndex]);
            screen.render();
        }
    } else if (key.name === 'down') {
        if (historyIndex < history.length -1) {
            historyIndex++;
            inputBox.setValue(history[historyIndex]);
            screen.render();
        } else {
            historyIndex = history.length;
            inputBox.clearValue();
            screen.render();
        }
    }
});

examplesList.on('select', (item, index) => {
    const selectedExample = examples[index];
    examplesList.hide();
    inputBox.focus();
    if (selectedExample) {
        handleCommand(selectedExample.command);
    }
    screen.render();
});

examplesList.key(['escape'], () => {
    examplesList.hide();
    inputBox.focus();
    screen.render();
});


// --- Global Key Handlers ---
screen.key(['C-e'], () => {
    examplesList.show();
    examplesList.focus();
});

screen.key(['escape', 'q', 'C-c'], () => {
  saveHistory();
  ws.close();
  // Give a moment for the close message to be sent
  setTimeout(() => process.exit(0), 100);
});

// --- Initial setup ---
inputBox.focus();
updateStatusBar();
connect();
screen.render();
