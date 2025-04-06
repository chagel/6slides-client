/**
 * Notion to Slides - Logging Service
 * 
 * Centralized logging functionality with support for different levels and destinations
 */

import { storage } from '../models/storage.js';

/**
 * Log levels in order of increasing severity
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Logging Service for centralized logging management
 */
class LoggingService {
  constructor() {
    // Default configuration
    this._enabled = true;
    this._debugEnabled = false;
    this._logLevel = LogLevel.INFO;
    this._prefix = '[Notion Slides]';
    this._storeDebugLogs = false; // Whether to store debug logs in localStorage/IndexedDB
    this._maxStoredLogs = 100; // Maximum number of logs to keep in storage
  }

  /**
   * Initialize the logging service with configuration
   * @param {Object} config - Logging configuration
   * @param {boolean} config.enabled - Whether logging is enabled at all
   * @param {boolean} config.debugEnabled - Whether debug logging is enabled
   * @param {string} config.logLevel - Minimum log level to output
   * @param {string} config.prefix - Prefix for log messages
   * @param {boolean} config.storeDebugLogs - Whether to store logs in storage
   */
  initialize(config = {}) {
    if (typeof config.enabled === 'boolean') this._enabled = config.enabled;
    if (typeof config.debugEnabled === 'boolean') this._debugEnabled = config.debugEnabled;
    if (config.logLevel) this._logLevel = config.logLevel;
    if (config.prefix) this._prefix = config.prefix;
    if (typeof config.storeDebugLogs === 'boolean') this._storeDebugLogs = config.storeDebugLogs;
    
    // Log initialization
    this.debug('Logging service initialized', { 
      debugEnabled: this._debugEnabled,
      logLevel: this._logLevel
    });
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether debug logging should be enabled
   */
  setDebugLogging(enabled) {
    this._debugEnabled = enabled;
    this.debug(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the current debug logging state
   * @returns {boolean} - Whether debug logging is enabled
   */
  isDebugLoggingEnabled() {
    return this._debugEnabled;
  }

  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to include
   */
  debug(message, data) {
    if (!this._enabled || !this._debugEnabled) return;
    
    this._log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to include
   */
  info(message, data) {
    if (!this._enabled || this._getSeverityValue(this._logLevel) > this._getSeverityValue(LogLevel.INFO)) {
      return;
    }
    
    this._log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {any} data - Optional data to include
   */
  warn(message, data) {
    if (!this._enabled || this._getSeverityValue(this._logLevel) > this._getSeverityValue(LogLevel.WARN)) {
      return;
    }
    
    this._log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error|any} error - Optional error object or data
   */
  error(message, error) {
    if (!this._enabled) return;
    
    const fullMessage = `${this._prefix} ${message}`;
    console.error(fullMessage, error || '');
    
    // Log stack trace if available
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Store error information if enabled
    this._storeLog({
      level: LogLevel.ERROR,
      message: message,
      data: error ? (error instanceof Error ? error.message : error) : undefined,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {any} data - Optional data
   * @private
   */
  _log(level, message, data) {
    const fullMessage = `${this._prefix} ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(fullMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, data || '');
        break;
      default:
        console.log(fullMessage, data || '');
    }
    
    // Store log if enabled
    if (this._storeDebugLogs || level === LogLevel.ERROR) {
      this._storeLog({
        level,
        message,
        data: data instanceof Error ? data.message : data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Store a log entry
   * @param {Object} logEntry - Log entry to store
   * @private
   */
  _storeLog(logEntry) {
    try {
      const currentLogs = this._getStoredLogs();
      
      // Add new log and limit the array size
      currentLogs.unshift(logEntry);
      if (currentLogs.length > this._maxStoredLogs) {
        currentLogs.length = this._maxStoredLogs;
      }
      
      // Save logs
      storage.saveDebugInfo({ logs: currentLogs });
    } catch (error) {
      // Don't use this.error to avoid potential infinite recursion
      console.error(`${this._prefix} Failed to store log`, error);
    }
  }

  /**
   * Get stored logs
   * @returns {Array<Object>} Array of log entries
   * @private
   */
  _getStoredLogs() {
    try {
      const debugInfo = JSON.parse(localStorage.getItem('slideDebugInfo') || '{"logs":[]}');
      return Array.isArray(debugInfo.logs) ? debugInfo.logs : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all stored logs
   * @returns {Array<Object>} Array of log entries
   */
  getStoredLogs() {
    return this._getStoredLogs();
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs() {
    try {
      storage.saveDebugInfo({ logs: [] });
    } catch (error) {
      console.error(`${this._prefix} Failed to clear logs`, error);
    }
  }

  /**
   * Convert log level to numeric severity value for comparison
   * @param {string} level - Log level
   * @returns {number} - Severity value
   * @private
   */
  _getSeverityValue(level) {
    switch (level) {
      case LogLevel.DEBUG: return 0;
      case LogLevel.INFO: return 1;
      case LogLevel.WARN: return 2;
      case LogLevel.ERROR: return 3;
      default: return 1; // Default to INFO level
    }
  }
}

// Export a singleton instance
export const loggingService = new LoggingService();