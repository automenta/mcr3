const PrologReasoner = require('../src/providers/prologReasoner');
const { PrologError } = require('../src/errors');

describe('PrologReasoner', () => {
  let reasoner;
  let session;

  beforeEach(() => {
    reasoner = new PrologReasoner();
    session = reasoner.createSession();
  });

  describe('consult', () => {
    it('should resolve for valid Prolog code', async () => {
      await expect(reasoner.consult(session, 'man(socrates).')).resolves.toBe(true);
    });

    it('should reject with PrologError for syntactically incorrect code', async () => {
      // "man(socrates)" is missing a period at the end.
      await expect(reasoner.consult(session, 'man(socrates)')).rejects.toThrow(PrologError);
    });
  });

  describe('query', () => {
    it('should resolve for a valid query', async () => {
      await reasoner.consult(session, 'man(socrates).');
      await expect(reasoner.query(session, 'man(X).')).resolves.toBe(true);
    });

    it('should reject with PrologError for a syntactically incorrect query', async () => {
      // "man(X)" is missing a period.
      await expect(reasoner.query(session, 'man(X)')).rejects.toThrow(PrologError);
    });
  });

  describe('getAnswers', () => {
    it('should retrieve correct answers after a successful query', async () => {
        await reasoner.consult(session, 'human(socrates). human(plato).');
        await reasoner.query(session, 'human(X).');
        const answers = await reasoner.getAnswers(session);
        expect(answers.length).toBe(2);
        expect(answers[0].links.X.id).toBe('socrates');
        expect(answers[1].links.X.id).toBe('plato');
    });
  });
});
