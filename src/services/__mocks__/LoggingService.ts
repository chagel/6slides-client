import { jest } from '@jest/globals';
import { LogLevel, LoggingConfig } from '../LoggingService';

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
  setConsoleLogging: jest.fn(),
  isDebugLoggingEnabled: jest.fn().mockReturnValue(false),
  getStoredLogs: jest.fn().mockReturnValue([]),
  getFilteredLogs: jest.fn().mockReturnValue([]),
  clearStoredLogs: jest.fn()
};

export { LogLevel };