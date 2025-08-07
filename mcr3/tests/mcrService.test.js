const MCRService = require('../src/services/mcrService');

// Mock the dependencies
jest.mock('../src/providers/prologReasoner', () => ({
  createSession: jest.fn(() => ({})),
  consult: jest.fn(() => Promise.resolve(true)),
  query: jest.fn(() => Promise.resolve(true)),
  getAnswers: jest.fn(() => Promise.resolve([{ toString: () => 'X = mary' }])),
}));

jest.mock('../src/store/sessionStore', () => ({
  createSession: jest.fn(() => 'mockSessionId'),
  getSession: jest.fn(() => ({ id: 'mockSessionId', kb: '', reasonerSession: {} })),
  updateSession: jest.fn(),
}));

jest.mock('../src/services/strategyManager', () => {
    return jest.fn().mockImplementation(() => {
        return {
            getActiveStrategy: jest.fn(() => ({
                execute: jest.fn((input) => Promise.resolve(input)),
            })),
        };
    });
});


const reasoner = require('../src/providers/prologReasoner');
const sessionStore = require('../src/store/sessionStore');
const StrategyManager = require('../src/services/strategyManager');

describe('MCRService', () => {
  let mcrService;

  beforeEach(() => {
    const strategyManager = new StrategyManager();
    mcrService = new MCRService({ reasoner, sessionStore, strategyManager });
  });

  test('should create a session, assert a fact, and query it', async () => {
    const sessionId = mcrService.createSession();
    expect(sessionId).toBe('mockSessionId');

    const fact = 'parent(john, mary).';
    const assertResult = await mcrService.assert(sessionId, fact);
    expect(assertResult.success).toBe(true);
    expect(assertResult.asserted).toBe(fact);
    expect(reasoner.consult).toHaveBeenCalledWith({}, fact);

    const query = 'parent(john, X).';
    const queryResult = await mcrService.query(sessionId, query);
    expect(queryResult.success).toBe(true);
    expect(queryResult.answers).toEqual(['X = mary']);
    expect(reasoner.query).toHaveBeenCalledWith({}, query);
  });
});
