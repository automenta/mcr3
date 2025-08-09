const pl = require('tau-prolog');

/**
 * A wrapper around tau-prolog to provide a consistent interface for reasoning.
 */
class PrologReasoner {
  constructor() {
    console.log('PrologReasoner initialized');
  }

  /**
   * Creates a new, isolated reasoning session.
   */
  createSession() {
    const session = pl.create(1000); // Limit number of resolutions
    console.log('New Prolog session created');
    return session;
  }

  /**
   * Asserts a Prolog program (facts and rules) into a session.
   * @param {object} session - The tau-prolog session object.
   * @param {string} program - A string containing the Prolog code.
   */
  consult(session, program) {
    return new Promise((resolve, reject) => {
      session.consult(program, {
        success: () => resolve(true),
        error: (err) => reject(this.parseError(err)),
      });
    });
  }

  /**
   * Executes a query against a session.
   * @param {object} session - The tau-prolog session object.
   * @param {string} query - The Prolog query string.
   */
  query(session, query) {
    return new Promise((resolve, reject) => {
      session.query(query, {
        success: () => resolve(true),
        error: (err) => reject(this.parseError(err)),
      });
    });
  }

  /**
   * Gets the answers for the last executed query.
   * @param {object} session - The tau-prolog session object.
   */
  getAnswers(session) {
    return new Promise(async (resolve) => {
      const answers = [];
      let answer;
      while ((answer = await this.answer(session))) {
        if (pl.is_substitution(answer)) {
          answers.push(answer);
        }
      }
      resolve(answers);
    });
  }

  /**
   * Helper to get a single answer.
   */
  answer(session) {
      return new Promise((resolve, reject) => {
          session.answer({
              success: (ans) => resolve(ans),
              error: (err) => reject(this.parseError(err)),
              fail: () => resolve(false),
              limit: () => resolve(true)
          });
      });
  }

  /**
   * Formats a tau-prolog error into a readable string.
   */
  parseError(err) {
    return `Prolog Error: ${err.toString()}`;
  }
}

module.exports = PrologReasoner;
