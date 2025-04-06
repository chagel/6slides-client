// Mock services for testing

// Create mock functions
export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

export const storage = {
  getSettings: jest.fn().mockReturnValue({}),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  getSlides: jest.fn().mockResolvedValue([]),
  saveSlides: jest.fn().mockResolvedValue(undefined)
};