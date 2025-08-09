/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  // The root directory that Jest should scan for tests and modules within.
  rootDir: '.',
  // An array of directory names to be searched recursively up from the requiring module's location.
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
};

module.exports = config;
