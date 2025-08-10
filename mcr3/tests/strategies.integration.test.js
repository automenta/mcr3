const MCRService = require('../src/services/mcrService');
const PrologReasoner = require('../src/providers/prologReasoner');
const SessionStore = require('../src/store/sessionStore');
const StrategyExecutor = require('../src/services/strategyExecutor');
const { AIMessage } = require('@langchain/core/messages');

// A more robust mocking strategy using a map
const promptResponseMap = {
    "Input: \"Socrates is a man.\"
Output:": "man('Socrates').",
    "Input: \"Adam is human and Eve is human.\"
Output:": `{"facts": ["human('Adam').", "human('Eve')."]}`,
    "Input: \"Who is a man?\"
Output:": "man(X).",
    "Input: \"man('Socrates').\"
Output:": "Socrates is a man.",
    "Input Rule: \"sibling(X, Y) :- parent(Z, X), parent(Z, Y).\"": `sibling(X, Y) :- parent(Z, X), parent(Z, Y), X \\= Y.`,
    'Natural Language Summary:': "Based on the knowledge base, Socrates is a man."
};

jest.mock('../src/providers/llmProvider', () => {
    return {
        createLlm: () => ({
            invoke: jest.fn().mockImplementation(async (prompt) => {
                const promptString = prompt.toString();
                for (const key in promptResponseMap) {
                    if (promptString.includes(key)) {
                        return new AIMessage(promptResponseMap[key]);
                    }
                }
                // Fallback for any unhandled prompt
                console.warn('Unhandled prompt in mock LLM:', promptString);
                return new AIMessage('mock_fallback_response.');
            }),
        }),
        getAvailableProviders: () => ['openai'],
    };
});

describe('Strategies Integration Test', () => {
    let mcrService;
    let sessionId;

    beforeAll(() => {
        const reasoner = new PrologReasoner();
        const sessionStore = new SessionStore();
        const strategyExecutor = new StrategyExecutor();
        mcrService = new MCRService({ reasoner, sessionStore, strategyExecutor });
    });

    beforeEach(async () => {
        sessionId = await mcrService.createSession();
    });

    jest.setTimeout(10000);

    it('should assert a single fact using nl-to-fact', async () => {
        const result = await mcrService.assert(sessionId, 'Socrates is a man.', 'nl-to-fact');
        expect(result.success).toBe(true);
        expect(result.asserted).toBe("man('Socrates').");
    });

    it('should assert multiple facts using nl-to-multi-fact', async () => {
        const result = await mcrService.assert(sessionId, 'Adam is human and Eve is human.', 'nl-to-multi-fact');
        expect(result.success).toBe(true);
        expect(result.asserted).toContain("human('Adam').");
        expect(result.asserted).toContain("human('Eve').");
    });

    it('should ask a question using nl-to-query', async () => {
        await mcrService.assert(sessionId, 'Socrates is a man.', 'nl-to-fact');
        const result = await mcrService.query(sessionId, 'Who is a man?', 'nl-to-query');
        expect(result.success).toBe(true);
        expect(result.answer.toLowerCase()).toContain('socrates');
    });

    it('should explain a fact using fact-to-nl', async () => {
        const result = await mcrService.explain(sessionId, "man('Socrates').");
        expect(result.success).toBe(true);
        expect(result.explanation.toLowerCase()).toContain('socrates is a man');
    });

    it('should critique and refine a rule using critique-and-refine-rule', async () => {
        const result = await mcrService.critiqueAndRefine(sessionId, 'sibling(X, Y) :- parent(Z, X), parent(Z, Y).');
        expect(result.success).toBe(true);
        expect(result.refinedRule).toContain('X \\= Y');
    });
});
