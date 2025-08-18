import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../mcr-helios-server.js');
const dbPath = path.resolve(__dirname, '../mcr_db.json');
const serverCwd = path.resolve(__dirname, '..');

// A client to interact with the MCP server over stdio
class McpClient {
    #serverProcess;
    #requestId = 0;
    #responses = new Map();
    #responseEmitter = new EventEmitter();
    #stdout_buffer = '';
    #stderr_buffer = '';

    start() {
        return new Promise((resolve, reject) => {
            this.#serverProcess = spawn('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: serverCwd,
            });

            const timeout = setTimeout(() => {
                const err = `Server start timed out after 10 seconds.\nSTDERR:\n${this.#stderr_buffer}\nSTDOUT:\n${this.#stdout_buffer}`;
                reject(new Error(err));
            }, 10000);

            this.#serverProcess.stderr.on('data', (data) => {
                const message = data.toString();
                // console.log(`-- SERVER STDERR: ${message.trim()}`); // Uncomment for deep debugging
                this.#stderr_buffer += message;
                if (message.includes('[McpServer] Listening on stdio for MCP messages.')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            this.#serverProcess.stdout.on('data', (data) => {
                this.#stdout_buffer += data.toString();
                this.#processStdoutBuffer();
            });

            this.#serverProcess.on('exit', (code) => {
                clearTimeout(timeout);
                const err = `Server process exited unexpectedly with code ${code}.\nSTDERR:\n${this.#stderr_buffer}\nSTDOUT:\n${this.#stdout_buffer}`;
                reject(new Error(err));
            });

            this.#serverProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    #processStdoutBuffer() {
        let boundary;
        while ((boundary = this.#stdout_buffer.indexOf('\n')) !== -1) {
            const messageStr = this.#stdout_buffer.substring(0, boundary);
            this.#stdout_buffer = this.#stdout_buffer.substring(boundary + 1);
            if (messageStr) {
                try {
                    const message = JSON.parse(messageStr);
                    this.#responses.set(message.id, message);
                    this.#responseEmitter.emit(message.id, message);
                } catch (e) {
                    // Ignore non-json stdout
                }
            }
        }
    }

    stop() {
        if (this.#serverProcess) {
            this.#serverProcess.kill('SIGTERM');
            this.#serverProcess = null;
        }
    }

    async call(tool, args = {}) {
        const id = this.#requestId++;
        const message = {
            protocol: 'mcp',
            version: 'v1',
            id,
            type: 'tools/call',
            payload: { tool, args },
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request ${id} (${tool}) timed out after 10000ms`));
            }, 10000);

            this.#responseEmitter.once(id, (response) => {
                clearTimeout(timeout);
                if (response.payload.status === 'success') {
                    resolve(response.payload.data);
                } else {
                    reject(new Error(response.payload.error.message));
                }
            });

            this.#serverProcess.stdin.write(JSON.stringify(message) + '\n');
        });
    }
}

// --- Test Suite ---

describe('MCR Helios Server', () => {
    let client;

    beforeEach(async () => {
        try {
            await fs.unlink(dbPath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        client = new McpClient();
        await client.start();
    }, 15000); // Increased timeout for setup

    afterEach(() => {
        if (client) {
            client.stop();
        }
    });

    describe('Suite 1: System & Configuration', () => {
        it('Test 1.1 (Initial Status)', async () => {
            const status = await client.call('system.status');
            expect(status.llmConfig).toEqual({});
            expect(status.kbCount).toBe(0);
        });

        it('Test 1.2 (LLM Configuration)', async () => {
            const config = { provider: 'openai', apiKey: 'test-key-not-real' };
            const result = await client.call('system.configure_llm', config);
            expect(result.message).toContain('updated to use openai');

            const status = await client.call('system.status');
            expect(status.llmConfig).toEqual(config);
        });

        it('Test 1.3 (Planner Prompt Transparency)', async () => {
            const { plannerPrompt } = await client.call('system.get_planner_prompt');
            expect(typeof plannerPrompt).toBe('string');
            expect(plannerPrompt.length).toBeGreaterThan(0);
        });
    });

    describe('Suite 2: Knowledge Base Management', () => {
        it('Test 2.1 (Creation & Listing)', async () => {
            const { id } = await client.call('kb.new', { id: 'test_kb_1' });
            expect(id).toBe('test_kb_1');

            const kbs = await client.call('kb.list');
            expect(kbs).toHaveLength(1);
            expect(kbs[0].id).toBe('test_kb_1');
        });

        it('Test 2.2 (Deletion)', async () => {
            await client.call('kb.new', { id: 'test_kb_1' });
            const result = await client.call('kb.delete', { id: 'test_kb_1' });
            expect(result.message).toBe("KB 'test_kb_1' deleted.");

            const kbs = await client.call('kb.list');
            expect(kbs).toHaveLength(0);
        });

        it('Test 2.3 (Forking)', async () => {
            await client.call('kb.new', { id: 'source' });
            const { newId } = await client.call('kb.fork', { sourceId: 'source', newId: 'forked' });
            expect(newId).toBe('forked');

            const kbs = await client.call('kb.list');
            expect(kbs).toHaveLength(2);
            expect(kbs.map(kb => kb.id).sort()).toEqual(['forked', 'source']);
        });

        it('Test 2.4 (Error Handling - Not Found)', async () => {
            await expect(client.call('kb.fork', { sourceId: 'non-existent' }))
                .rejects.toThrow(/not found/i);

            await expect(client.call('kb.delete', { id: 'non-existent' }))
                .rejects.toThrow(/not found/i);
        });
    });

    describe('Suite 3: Core Reasoning ("Socrates" Test)', () => {
        beforeEach(async () => {
            await client.call('kb.new', { id: 'socrates_test' });
        });

        it('Test 3.3 & 3.4 (Execution and Verification)', async () => {
            const plan = [["ASSERT", "man(socrates)."]];
            const result = await client.call('mcr.execute', { kbId: 'socrates_test', logicalPlan: plan });
            expect(result.naturalLanguageSummary).toBeDefined();

            const { knowledgeBase } = await client.call('system.get_kb', { id: 'socrates_test' });
            expect(knowledgeBase).toContain('man(socrates).');
        });

        it('Test 3.5 (Multi-Step Reasoning)', async () => {
            const plan = [
                ["ASSERT", "mortal(X) :- man(X)."],
                ["ASSERT", "man(socrates)."],
                ["QUERY", "mortal(socrates)."]
            ];
            const result = await client.call('mcr.execute', { kbId: 'socrates_test', logicalPlan: plan });
            expect(result.finalResult).toEqual(["Yes / True."]);
        });

        it('Test 3.6 (Transactional Failure & Rollback)', async () => {
            const plan = [
                ["ASSERT", "human(socrates)."],
                ["ASSERT", "this_is_bad_prolog."]
            ];
            await expect(client.call('mcr.execute', { kbId: 'socrates_test', logicalPlan: plan }))
                .rejects.toThrow(/Prolog error in step 2/);

            const { knowledgeBase } = await client.call('system.get_kb', { id: 'socrates_test' });
            expect(knowledgeBase).not.toContain('human(socrates).');
        });
    });

    describe('Suite 4: Composable Knowledge (Imports)', () => {
        beforeEach(async () => {
            await client.call('kb.new', { id: 'rules' });
            await client.call('mcr.execute', { kbId: 'rules', logicalPlan: [["ASSERT", "parent(X, Y) :- father(X, Y)."]] });
            await client.call('kb.new', { id: 'data', imports: ['rules'] });
            await client.call('mcr.execute', { kbId: 'data', logicalPlan: [["ASSERT", "father(john, mary)."]] });
        });

        it('Test 4.2 (Verification of Composition)', async () => {
            const result = await client.call('mcr.execute', { kbId: 'data', logicalPlan: [["QUERY", "parent(john, mary)."]] });
            expect(result.finalResult).toEqual(["Yes / True."]);
        });

        it('Test 4.3 (Verification of Isolation)', async () => {
            const { knowledgeBase } = await client.call('system.get_kb', { id: 'rules' });
            // Normalize whitespace to prevent test failures due to formatting differences
            const normalize = (str) => str.replace(/\s+/g, '');
            expect(normalize(knowledgeBase)).toContain(normalize('parent(X, Y) :- father(X, Y).'));
            expect(knowledgeBase).not.toContain('father(john, mary).');
        });
    });

    describe('Suite 5: Persistence & State', () => {
        it('Test 5.1 & 5.2 (Restart & Verification)', async () => {
            await client.call('kb.new', { id: 'persistent_kb' });
            await client.call('mcr.execute', { kbId: 'persistent_kb', logicalPlan: [["ASSERT", "state(persisted)."]] });

            client.stop();

            const newClient = new McpClient();
            await newClient.start();

            try {
                const kbs = await newClient.call('kb.list');
                const persistentKb = kbs.find(kb => kb.id === 'persistent_kb');
                expect(persistentKb).toBeDefined();

                const { knowledgeBase } = await newClient.call('system.get_kb', { id: 'persistent_kb' });
                expect(knowledgeBase).toContain('state(persisted).');
            } finally {
                newClient.stop();
            }
        }, 20000); // Longer timeout for this specific test
    });
});
