/**
 * Notion to Slides - Common Utilities
 */

/**
 * Log a message to the console with a prefix for debugging
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export function logDebug(message, data) {
  console.log(`[Notion Slides] ${message}`, data || '');
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