const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config();

const WebSocketHandler = require('./api/websocketHandler');
const MCRService = require('./services/mcrService');
const StrategyManager = require('./services/strategyManager');
const StrategyExecutor = require('./services/strategyExecutor');
const reasoner = require('./providers/prologReasoner');
const sessionStore = require('./store/sessionStore');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// --- Dependency Injection ---
// Initialize the core services and handlers
const strategyExecutor = new StrategyExecutor();
const mcrService = new MCRService({
  reasoner,
  sessionStore,
  strategyExecutor,
});
const webSocketHandler = new WebSocketHandler(mcrService);

// Serve the MCR Workbench UI static files
// This assumes the UI has been built into the 'ui/dist' directory
const uiBuildPath = path.join(__dirname, '..', 'ui', 'dist');
app.use(express.static(uiBuildPath));

// --- WebSocket connection handling ---
// Defer connection handling to the WebSocketHandler
wss.on('connection', (ws) => {
  webSocketHandler.handleConnection(ws);
});

// Main entry point
server.listen(PORT, () => {
  console.log(`MCR3 Server is listening on port ${PORT}`);
  console.log(`MCR Workbench UI available at http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    wss.close(() => {
        server.close(() => {
            console.log('Server shut down.');
            process.exit(0);
        });
    });
});
