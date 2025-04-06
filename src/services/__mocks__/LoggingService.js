import { jest } from '@jest/globals';

// Create mock logging service with real Jest mock functions
export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setDebugLogging: jest.fn(),
  setLogLevel: jest.fn(),
  setStoreDebugLogs: jest.fn(),
  initialize: jest.fn(),
  setConsoleLogging: jest.fn()
};

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};