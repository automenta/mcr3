const { v4: uuidv4 } = require('uuid');

/**
 * Manages stateful sessions for MCR.
 * This is a simple in-memory implementation for now.
 * A persistent store (e.g., file-based or database) would be a future extension.
 */
class SessionStore {
  constructor() {
    this.sessions = new Map();
    console.log('SessionStore initialized (in-memory)');
  }

  /**
   * Creates a new session and returns its ID.
   * @param {object} sessionData - Optional data to store with the session.
   * @returns {string} The newly created session ID.
   */
  createSession(sessionData = {}) {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date(),
      kb: '', // The knowledge base as a string of Prolog
      ...sessionData,
    });
    console.log(`Session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Retrieves a session by its ID.
   * @param {string} sessionId
   * @returns {object | undefined} The session object, or undefined if not found.
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Updates a session's data.
   * @param {string} sessionId
   * @param {object} updatedData
   * @returns {boolean} True if the session was found and updated, false otherwise.
   */
  updateSession(sessionId, updatedData) {
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      this.sessions.set(sessionId, { ...session, ...updatedData });
      return true;
    }
    return false;
  }

  /**
   * Deletes a session.
   * @param {string} sessionId
   * @returns {boolean} True if the session was found and deleted, false otherwise.
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }
}

// Export a singleton instance
module.exports = new SessionStore();
