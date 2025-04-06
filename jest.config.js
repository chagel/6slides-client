/** @type {import('jest').Config} */
const config = {
  // JS DOM environment for testing
  testEnvironment: 'jsdom',
  
  // Using ESM is specified in package.json
  // Allow ES modules
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$)'
  ],
  
  // Apply transforms
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  
  // Test match pattern
  testMatch: ['**/tests/**/*.test.{js,ts}'],
  
  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Extensions to import
  moduleFileExtensions: ['js', 'ts'],
  
  // Module directories
  modulePaths: ['<rootDir>'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/models/extractors/**/*.{js,ts}',
    '!src/models/extractors/index.{js,ts}'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout
  testTimeout: 5000,
  
  // ESM Support
  extensionsToTreatAsEsm: ['.ts']
};

export default config;