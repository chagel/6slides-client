/**
 * Notion to Slides - Common Utilities
 */

// Global flag to control debug logging
let debugLoggingEnabled = false;

/**
 * Enable or disable debug logging
 * @param {boolean} enabled - Whether debug logging should be enabled
 */
export function setDebugLogging(enabled) {
  debugLoggingEnabled = enabled;
}

/**
 * Get the current debug logging state
 * @returns {boolean} - Whether debug logging is enabled
 */
export function isDebugLoggingEnabled() {
  return debugLoggingEnabled;
}

/**
 * Log a message to the console with a prefix for debugging
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export function logDebug(message, data) {
  if (debugLoggingEnabled) {
    console.log(`[Notion Slides] ${message}`, data || '');
  }
}

/**
 * Log an error to the console with a prefix
 * @param {string} message - Error message
 * @param {Error} error - Optional error object
 */
export function logError(message, error) {
  console.error(`[Notion Slides Error] ${message}`, error || '');
  if (error && error.stack) {
    console.error(`Stack trace:`, error.stack);
  }
}