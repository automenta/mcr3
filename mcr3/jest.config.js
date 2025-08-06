/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
};

module.exports = config;
