/**
 * Six Slides - Testing Setup
 */

// Import Jest functions
import { jest } from '@jest/globals';

// Automatically mock the LoggingService module
jest.mock('../src/services/logging_service');

// Create a minimal chrome mock for tests
// This approach avoids conflicts with @types/chrome
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      getURL: jest.fn((path: string) => path)
    }
  },
  writable: true
});