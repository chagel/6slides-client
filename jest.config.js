/** @type {import('jest').Config} */
const config = {
  // JS DOM environment for testing
  testEnvironment: 'jsdom',
  
  // Using ESM is specified in package.json
  
  // Apply transforms
  transform: {},
  
  // Test match pattern
  testMatch: ['**/tests/**/*.test.js'],
  
  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Module directories
  modulePaths: ['<rootDir>'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/models/extractors/**/*.js',
    '!src/models/extractors/index.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout
  testTimeout: 5000
};

export default config;