// mcr-helios-server.js - The Definitive Neurosymbolic Platform

// 1. Imports
import fs from 'fs/promises';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import session from 'tau-prolog';
import { ChatOpenAI as OpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI as GoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// 2. Constants
const DB_FILE = 'mcr_db.json';
const PLANNER_PROMPT_TEMPLATE = `
You are an AI assistant that converts natural language requests into a structured, step-by-step logical plan that can be executed by a Prolog-based reasoning engine.

The user's request is:
{user_request}

The available knowledge base (KB) contains facts and rules. You can interact with it using a sequence of commands in a JSON array format, called a "LogicalPlan".

The available commands are:
- ["ASSERT", "prolog_fact_or_rule."] - Adds a new fact or rule to the KB. Use this to teach the system new information. Example: ["ASSERT", "mortal(X) :- man(X)."]
- ["RETRACT", "prolog_fact_or_rule."] - Removes a fact or rule.
- ["QUERY", "prolog_query."] - Asks a question to the KB. The system will check if the query can be proven true based on the current knowledge. Example: ["QUERY", "mortal(socrates)."]

Based on the user's request, generate a LogicalPlan to accomplish their goal.

If the user is asking a question, your plan should usually end with a "QUERY" command.
If the user is providing information, your plan should usually consist of one or more "ASSERT" commands.

Here is the user's request:
"{user_request}"

Provide only the JSON array for the LogicalPlan.

LogicalPlan:
`;
const MIN_EXAMPLES_FOR_EVOLUTION = 3;

// 3. Database Class
class Database {
  #db;

  constructor(filename) {
    const adapter = new JSONFile(filename);
    this.#db = new Low(adapter, { sessions: {}, performanceLog: [], plannerPrompt: PLANNER_PROMPT_TEMPLATE });
  }

  get data() {
    return this.#db.data;
  }

  async read() {
    await this.#db.read();
    this.#db.data ||= { sessions: {}, performanceLog: [], plannerPrompt: PLANNER_PROMPT_TEMPLATE };
  }

  async write() {
    await this.#db.write();
  }
}

// 4. McrWorkspace Class
class McrWorkspace {
    #db;
    #kbCache = new Map();
    #saveTimers = new Map();
    #llm = null;
    #llmConfig = {};

    constructor(db) {
        this.#db = db;
    }

    // --- Private Helpers ---

    async #getDbSnapshot(prologSession) {
        const snapshot = prologSession.toString();
        // Tau's toString() can include system-level directives, which we don't want in the snapshot.
        const cleanedSnapshot = snapshot.split('\n').filter(line => !line.startsWith(':- use_module(library(')).join('\n').trim();
        return Promise.resolve(cleanedSnapshot);
    }

    #rehydrateFromSnapshot(snapshot) {
        const newSession = session.create();
        if (snapshot) {
            newSession.consult(snapshot);
        }
        return newSession;
    }

    async #getOrHydrateKB(kbId) {
        if (this.#kbCache.has(kbId)) {
            return this.#kbCache.get(kbId);
        }

        const kbData = this.#db.data.sessions[kbId];
        if (!kbData) {
            throw new Error(`Knowledge Base with id '${kbId}' not found.`);
        }

        const orderedImports = this.#resolveImportOrder(kbId);

        const prolog = session.create();
        for (const importId of orderedImports) {
            const importData = this.#db.data.sessions[importId];
            if (importData && importData.prologSnapshot) {
                await new Promise((resolve, reject) => {
                    prolog.consult(importData.prologSnapshot, {
                        success: resolve,
                        error: (err) => reject(new Error(`Error consulting snapshot for imported KB '${importId}': ${err}`)),
                    });
                });
            }
        }

        const liveSession = {
            prolog,
            isDirty: false,
        };

        this.#kbCache.set(kbId, liveSession);
        return liveSession;
    }

    #resolveImportOrder(startKbId) {
        const resolved = new Set();
        const visiting = new Set();

        const visit = (kbId) => {
            if (resolved.has(kbId)) {
                return;
            }
            if (visiting.has(kbId)) {
                throw new Error(`Circular dependency detected in KB imports: ${[...visiting, kbId].join(' -> ')}`);
            }

            const kbData = this.#db.data.sessions[kbId];
            if (!kbData) {
                resolved.add(kbId);
                return;
            }

            visiting.add(kbId);
            (kbData.imports || []).forEach(visit);
            visiting.delete(kbId);
            resolved.add(kbId);
        };

        visit(startKbId);
        return [...resolved].filter(id => this.#db.data.sessions[id]);
    }

    #debouncedSave(kbId) {
        if (this.#saveTimers.has(kbId)) {
            clearTimeout(this.#saveTimers.get(kbId));
        }

        const timer = setTimeout(async () => {
            const liveSession = this.#kbCache.get(kbId);
            if (liveSession && liveSession.isDirty) {
                try {
                    const snapshot = await this.#getDbSnapshot(liveSession.prolog);
                    this.#db.data.sessions[kbId].prologSnapshot = snapshot;
                    await this.#db.write();
                    liveSession.isDirty = false;
                    this.#saveTimers.delete(kbId);
                    console.error(`[Workspace] Auto-saved KB: ${kbId}`);
                } catch (error) {
                    console.error(`[Workspace] Error auto-saving KB ${kbId}:`, error);
                }
            }
        }, 2000);

        this.#saveTimers.set(kbId, timer);
    }

    async shutdown() {
        // Clear all debounced timers to prevent them from running during shutdown
        for (const timer of this.#saveTimers.values()) {
            clearTimeout(timer);
        }
        this.#saveTimers.clear();

        // Collect all promises for saving dirty KBs
        const savePromises = [];
        for (const [kbId, liveSession] of this.#kbCache.entries()) {
            if (liveSession.isDirty) {
                const promise = (async () => {
                    try {
                        const snapshot = await this.#getDbSnapshot(liveSession.prolog);
                        this.#db.data.sessions[kbId].prologSnapshot = snapshot;
                        liveSession.isDirty = false;
                        console.error(`[Workspace] Saving dirty KB ${kbId} during shutdown.`);
                    } catch (error) {
                        console.error(`[Workspace] Error saving KB ${kbId} during shutdown:`, error);
                    }
                })();
                savePromises.push(promise);
            }
        }

        // If there were any dirty sessions, wait for all saves to be prepared and then write to DB once.
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
            try {
                await this.#db.write();
                console.error(`[Workspace] Successfully persisted ${savePromises.length} KBs to disk during shutdown.`);
            } catch (error) {
                console.error(`[Workspace] Critical error writing database file during shutdown:`, error);
            }
        }
    }

    // --- Public API Methods ---

    // --- kb.* ---

    async new({ id, imports = [] } = {}) {
        const kbId = id || `kb_${Date.now()}`;
        if (this.#db.data.sessions[kbId]) {
            throw new Error(`Knowledge Base with id '${kbId}' already exists.`);
        }

        this.#db.data.sessions[kbId] = {
            id: kbId,
            imports,
            prologSnapshot: "",
            history: [],
        };
        await this.#db.write();
        return { id: kbId };
    }

    async list() {
        return Object.values(this.#db.data.sessions).map(kb => ({
            id: kb.id,
            imports: kb.imports || [],
            historyCount: (kb.history || []).length,
        }));
    }

    async fork({ sourceId, newId }) {
        const sourceData = this.#db.data.sessions[sourceId];
        if (!sourceData) {
            throw new Error(`Source Knowledge Base with id '${sourceId}' not found.`);
        }
        const kbId = newId || `${sourceId}_fork_${Date.now()}`;
        if (this.#db.data.sessions[kbId]) {
            throw new Error(`Target Knowledge Base with id '${kbId}' already exists.`);
        }

        const newData = JSON.parse(JSON.stringify(sourceData));
        newData.id = kbId;
        newData.history = [];

        this.#db.data.sessions[kbId] = newData;
        await this.#db.write();
        this.#kbCache.delete(kbId);

        return { newId: kbId };
    }

    async delete({ id }) {
        if (!this.#db.data.sessions[id]) {
            throw new Error(`Knowledge Base with id '${id}' not found.`);
        }
        delete this.#db.data.sessions[id];
        this.#kbCache.delete(id);
        if (this.#saveTimers.has(id)) {
            clearTimeout(this.#saveTimers.get(id));
            this.#saveTimers.delete(id);
        }
        await this.#db.write();
        return { message: `KB '${id}' deleted.` };
    }

    // --- mcr.* ---

    async plan({ kbId, request }) {
        if (!this.#llm) {
            throw new Error("LLM provider has not been configured. Please call system.configure_llm first.");
        }

        const plannerPrompt = this.#db.data.plannerPrompt;
        const prompt = PromptTemplate.fromTemplate(plannerPrompt);
        const parser = new JsonOutputParser();
        const chain = prompt.pipe(this.#llm).pipe(parser);

        try {
            const logicalPlan = await chain.invoke({ user_request: request });
            return { logicalPlan };
        } catch (error) {
            console.error("[Workspace] Error parsing LLM plan output:", error);
            throw new Error("Failed to generate a valid logical plan. The LLM may have returned a malformed response.");
        }
    }

    async execute({ kbId, logicalPlan }) {
        const liveSession = await this.#getOrHydrateKB(kbId);
        const prolog = liveSession.prolog;

        const snapshotBefore = await this.#getDbSnapshot(prolog);
        let finalResult = null;
        let anyAsserts = false;

        const logEntry = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            plan: logicalPlan,
            outcome: null,
            finalResult: null,
            naturalLanguageSummary: null,
            feedbackProvided: false,
        };

        try {
            for (const [index, step] of logicalPlan.entries()) {
                const [command, ...args] = step;
                if (typeof command !== 'string' || !args[0]) {
                    throw new Error(`Invalid plan step at index ${index}: must be an array with at least two elements, e.g., ["COMMAND", "argument"].`);
                }
                const commandStr = `${command.toUpperCase()} ${args[0]}`;

                switch (command.toUpperCase()) {
                    case 'ASSERT':
                    case 'RETRACT': {
                        anyAsserts = true;
                        const program = args[0];

                        // Validation: The system design requires structured facts. Simple atoms are disallowed.
                        // This regex checks for a simple atom clause like `foo.` which is valid Prolog but not supported here.
                        if (/^[a-z_][a-zA-Z0-9_]*\.$/.test(program.trim())) {
                            throw new Error(`Prolog error in step ${index + 1} (${commandStr}): Simple atom facts like '${program}' are not supported. Facts must be structured terms, e.g., 'predicate(argument)'.`);
                        }

                        // Use query as a preliminary syntax check. It's not perfect but catches some errors.
                        prolog.query(program);
                        await new Promise((resolve, reject) => {
                            prolog.consult(program, {
                                success: () => resolve(),
                                error: (err) => reject(new Error(`Prolog error in step ${index + 1} (${commandStr}): ${err}`)),
                            });
                        });
                        break;
                    }
                    case 'QUERY': {
                        finalResult = [];
                        const query = prolog.query(args[0]);
                        if (!query || typeof query.next !== 'function') {
                            // This can happen if the prolog session is in a corrupted state after a failed consult.
                            throw new Error(`Prolog engine error: prolog.query() failed for query "${args[0]}". The session may be corrupted.`);
                        }
                        let answer;
                        while ((answer = await new Promise(res => query.next(res)))) {
                            if (session.is_substitution(answer)) {
                                finalResult.push(prolog.format_answer(answer, { quoted: true }));
                            }
                        }
                        if (finalResult.length === 0 && answer === true) {
                            finalResult.push("Yes / True.");
                        }
                        break;
                    }
                    default:
                        throw new Error(`Unknown command in step ${index + 1}: ${command}`);
                }
            }

            if (anyAsserts) {
                liveSession.isDirty = true;
                this.#debouncedSave(kbId);
            }

            logEntry.outcome = 'success';
            logEntry.finalResult = finalResult;

            const summary = `Successfully executed ${logicalPlan.length} steps. Final result: ${JSON.stringify(finalResult)}`;
            logEntry.naturalLanguageSummary = summary;

            return { naturalLanguageSummary: summary, finalResult, logId: logEntry.id };

        } catch (error) {
            this.#kbCache.set(kbId, {
                ...liveSession,
                prolog: this.#rehydrateFromSnapshot(snapshotBefore),
                isDirty: false,
            });

            logEntry.outcome = 'error';
            logEntry.error = { message: error.message };

            throw error;
        } finally {
            if (this.#db.data.sessions[kbId]) {
                this.#db.data.sessions[kbId].history.push(logEntry);
                await this.#db.write();
            }
        }
    }

    // --- system.* ---

    async get_kb({ id }) {
        const liveSession = await this.#getOrHydrateKB(id);
        const knowledgeBase = await this.#getDbSnapshot(liveSession.prolog);
        return { knowledgeBase };
    }

    async get_history({ id }) {
        const kbData = this.#db.data.sessions[id];
        if (!kbData) {
            throw new Error(`Knowledge Base with id '${id}' not found.`);
        }
        return { history: kbData.history || [] };
    }

    async learn({ logId, isCorrect, correctedPlan }) {
        let logFound = false;
        for (const kbId in this.#db.data.sessions) {
            const history = this.#db.data.sessions[kbId].history || [];
            const logEntry = history.find(entry => entry.id === logId);
            if (logEntry) {
                logFound = true;
                const performanceEntry = {
                    originalRequest: logEntry.request,
                    originalPlan: logEntry.plan,
                    isCorrect,
                    correctedPlan: isCorrect ? null : correctedPlan,
                    timestamp: new Date().toISOString(),
                };
                this.#db.data.performanceLog.push(performanceEntry);
                logEntry.feedbackProvided = true;
                await this.#db.write();
                return { message: "Feedback recorded." };
            }
        }
        if (!logFound) {
            throw new Error(`Log entry with id '${logId}' not found.`);
        }
    }

    async evolve() {
        const examples = this.#db.data.performanceLog.filter(e => !e.isCorrect && e.correctedPlan);
        if (examples.length < MIN_EXAMPLES_FOR_EVOLUTION) {
            throw new Error(`Not enough learning examples to evolve. Need at least ${MIN_EXAMPLES_FOR_EVOLUTION}, but only have ${examples.length}.`);
        }
        if (!this.#llm) {
            throw new Error("LLM provider has not been configured for evolution.");
        }

        const evolutionPromptText = `You are a master prompt engineer. Your task is to refine a prompt used to guide an LLM.
The original prompt is:
---
${this.#db.data.plannerPrompt}
---
The LLM made some mistakes. Here are examples of its incorrect plans and the corrected versions:
${examples.map(e => `Request: "${e.originalRequest}"\nOriginal Plan: ${JSON.stringify(e.originalPlan)}\nCorrected Plan: ${JSON.stringify(e.correctedPlan)}`).join('\n\n')}

Based on these corrections, generate a new, improved prompt that is more likely to produce the correct plans in the future.
Provide only the new prompt text.`;

        const newPrompt = await this.#llm.invoke(evolutionPromptText);

        this.#db.data.plannerPrompt = newPrompt;
        this.#db.data.performanceLog = [];
        await this.#db.write();

        return { newPrompt, examplesUsed: examples.length };
    }

    async get_planner_prompt() {
        return { plannerPrompt: this.#db.data.plannerPrompt };
    }

    async configure_llm({ provider, ...config }) {
        this.#llmConfig = { provider, ...config };
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("API key is missing. Provide it in the call or set OPENAI_API_KEY/GOOGLE_API_KEY environment variables.");
        }

        switch (provider.toLowerCase()) {
            case 'openai':
                this.#llm = new OpenAI({ apiKey, ...config });
                break;
            case 'google':
                this.#llm = new GoogleGenerativeAI({ apiKey, ...config });
                break;
            default:
                this.#llm = null;
                throw new Error(`Unsupported LLM provider: ${provider}. Supported providers are 'openai', 'google'.`);
        }
        return { message: `Global LLM configuration updated to use ${provider}.` };
    }

    async status() {
        return {
            llmConfig: this.#llmConfig,
            kbCount: Object.keys(this.#db.data.sessions).length,
        };
    }
}

// 5. McpServer Class
class McpServer {
    #workspace;
    #buffer = '';
    #tools = {};

    constructor(workspace) {
        this.#workspace = workspace;
        this.#registerTools();
    }

    #registerTools() {
        this.#tools['kb.new'] = (args) => this.#workspace.new(args);
        this.#tools['kb.list'] = () => this.#workspace.list();
        this.#tools['kb.fork'] = (args) => this.#workspace.fork(args);
        this.#tools['kb.delete'] = (args) => this.#workspace.delete(args);

        this.#tools['mcr.plan'] = (args) => this.#workspace.plan(args);
        this.#tools['mcr.execute'] = (args) => this.#workspace.execute(args);

        this.#tools['system.get_kb'] = (args) => this.#workspace.get_kb(args);
        this.#tools['system.get_history'] = (args) => this.#workspace.get_history(args);
        this.#tools['system.learn'] = (args) => this.#workspace.learn(args);
        this.#tools['system.evolve'] = () => this.#workspace.evolve();
        this.#tools['system.get_planner_prompt'] = () => this.#workspace.get_planner_prompt();
        this.#tools['system.configure_llm'] = (args) => this.#workspace.configure_llm(args);
        this.#tools['system.status'] = () => this.#workspace.status();
    }

    listen() {
        process.stdin.on('data', (chunk) => {
            this.#buffer += chunk.toString();
            this.#processBuffer();
        });

        process.stdin.on('end', () => {
            console.error('[McpServer] Stdin stream ended.');
        });

        console.error('[McpServer] Listening on stdio for MCP messages.');
    }

    #processBuffer() {
        let boundary;
        while ((boundary = this.#buffer.indexOf('\n')) !== -1) {
            const messageStr = this.#buffer.substring(0, boundary);
            this.#buffer = this.#buffer.substring(boundary + 1);
            if (messageStr) {
                this.#handleMessage(messageStr);
            }
        }
    }

    async #handleMessage(messageStr) {
        let message;
        try {
            message = JSON.parse(messageStr);
            if (message.protocol !== 'mcp' || message.version !== 'v1') {
                throw new Error('Invalid MCP protocol or version.');
            }

            if (message.type === 'tools/call') {
                const { tool, args } = message.payload;

                if (!this.#tools[tool]) {
                    throw new Error(`Tool '${tool}' not found.`);
                }

                const result = await this.#tools[tool](args);
                this.#sendResponse(message.id, result);

            } else {
                throw new Error(`Unsupported message type: ${message.type}`);
            }
        } catch (error) {
            this.#sendError(message ? message.id : null, error);
        }
    }

    #sendResponse(requestId, data) {
        const response = {
            protocol: 'mcp',
            version: 'v1',
            type: 'tools/response',
            id: requestId,
            payload: {
                status: 'success',
                data: data,
            },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }

    #sendError(requestId, error) {
        const response = {
            protocol: 'mcp',
            version: 'v1',
            type: 'tools/response',
            id: requestId,
            payload: {
                status: 'error',
                error: {
                    message: error.message,
                },
            },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }
}

// 6. Main Execution Block
async function main() {
    console.error(`[Main] Initializing MCR Helios Server...`);
    const db = new Database(DB_FILE);

    try {
        await db.read();
        console.error(`[Main] Database loaded from ${DB_FILE}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`[Main] No database file found at ${DB_FILE}. Initializing a new one.`);
            await db.write();
        } else {
            console.error(`[Main] Could not read database file. Error: ${error.message}`);
        }
    }

    const workspace = new McrWorkspace(db);
    const server = new McpServer(workspace);

    server.listen();

    const shutdown = async (signal) => {
        console.error(`\n[Main] Received ${signal}. Shutting down gracefully...`);
        await workspace.shutdown();
        console.error('[Main] MCR Helios Server has shut down.');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
    console.error('[Main] A critical error occurred during startup:', error);
    process.exit(1);
});
