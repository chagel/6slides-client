/**
 * Notion to Slides - Testing Setup
 */

// Import Jest functions
import { jest } from '@jest/globals';

// Automatically mock the LoggingService module
jest.mock('../src/services/LoggingService.ts');

// Set up Chrome API mock
global.chrome = {
  runtime: {
    getURL: jest.fn(path => path)
  }
};