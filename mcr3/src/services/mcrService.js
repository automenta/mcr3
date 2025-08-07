/**
 * The MCR Service is the central orchestrator of the MCR system.
 * It manages sessions, executes translation strategies, and interacts with
 * the reasoner and other providers.
 */
class MCRService {
  constructor({ reasoner, sessionStore, strategyManager }) {
    this.reasoner = reasoner;
    this.sessionStore = sessionStore;
    this.strategyManager = strategyManager;
    console.log('MCRService initialized');
  }

  /**
   * Creates a new session.
   * @returns {string} The ID of the new session.
   */
  createSession() {
    const sessionId = this.sessionStore.createSession();
    const reasonerSession = this.reasoner.createSession();
    this.sessionStore.updateSession(sessionId, { reasonerSession });
    return sessionId;
  }

  async assert(sessionId, naturalLanguageInput) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const strategy = this.strategyManager.getActiveStrategy();
    const prologCode = await strategy.execute(naturalLanguageInput);

    await this.reasoner.consult(session.reasonerSession, prologCode);

    const updatedKb = `${session.kb}\n${prologCode}`;
    this.sessionStore.updateSession(sessionId, { kb: updatedKb });

    return { success: true, asserted: prologCode };
  }

  async query(sessionId, naturalLanguageInput) {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const strategy = this.strategyManager.getActiveStrategy();
    const queryString = await strategy.execute(naturalLanguageInput);

    await this.reasoner.query(session.reasonerSession, queryString);
    const answers = await this.reasoner.getAnswers(session.reasonerSession);

    // For now, return the raw Tau Prolog answers
    return { success: true, answers: answers.map(a => a.toString()) };
  }
}

module.exports = MCRService;
