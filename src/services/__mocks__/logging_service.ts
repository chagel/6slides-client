import { jest } from '@jest/globals';

// Define LogLevel enum without importing from real service
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Create mock logging service with real Jest mock functions
export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setDebugLogging: jest.fn(),
  setLogLevel: jest.fn(),
  initialize: jest.fn(),
  isDebugLoggingEnabled: jest.fn(() => false),
  getLogs: jest.fn(() => Promise.resolve([])),
  clearLogs: jest.fn(() => Promise.resolve())
};