// Mock services for testing
import { jest } from '@jest/globals';
import type { Slide, Settings } from '../../src/types';

// Create mock functions with TypeScript types
export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setDebugLogging: jest.fn(),
  setLogLevel: jest.fn(),
  isDebugLoggingEnabled: jest.fn().mockReturnValue(false),
  getStoredLogs: jest.fn().mockReturnValue([]),
  getFilteredLogs: jest.fn().mockReturnValue([])
};

export const storage = {
  getSettings: jest.fn().mockReturnValue({} as Settings),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  getSlides: jest.fn().mockResolvedValue([] as Slide[]),
  saveSlides: jest.fn().mockResolvedValue(undefined),
  getDebugInfo: jest.fn().mockReturnValue({ logs: [] }),
  saveDebugInfo: jest.fn().mockResolvedValue(undefined)
};