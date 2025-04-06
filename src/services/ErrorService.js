/**
 * Notion to Slides - Error Service
 * 
 * Centralized error handling and recovery strategies.
 * Works together with LoggingService for actual logging operations.
 */

import { loggingService, LogLevel } from './LoggingService.js';

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  EXTRACTION: 'extraction',
  RENDERING: 'rendering',
  STORAGE: 'storage',
  NETWORK: 'network',
  UI: 'ui',
  UNKNOWN: 'unknown'
};

/**
 * Error severities that map to logging levels
 */
export const ErrorSeverity = {
  INFO: 'info',      // Maps to LogLevel.INFO
  WARNING: 'warning', // Maps to LogLevel.WARN
  ERROR: 'error',    // Maps to LogLevel.ERROR
  CRITICAL: 'critical' // Maps to LogLevel.ERROR with special handling
};

/**
 * Maps ErrorSeverity to LogLevel
 * @private
 */
const SEVERITY_TO_LOG_LEVEL = {
  [ErrorSeverity.INFO]: LogLevel.INFO,
  [ErrorSeverity.WARNING]: LogLevel.WARN,
  [ErrorSeverity.ERROR]: LogLevel.ERROR,
  [ErrorSeverity.CRITICAL]: LogLevel.ERROR
};

/**
 * Error Service for centralized error handling and recovery strategies
 */
class ErrorService {
  constructor() {
    this._isTelemetryEnabled = false;
    
    loggingService.debug('ErrorService initialized');
  }
  
  /**
   * Enable or disable error telemetry
   * @param {boolean} enabled - Whether to enable telemetry
   */
  setTelemetryEnabled(enabled) {
    this._isTelemetryEnabled = enabled;
  }
  
  /**
   * Track an error
   * @param {Error|string} error - Error object or message
   * @param {Object} options - Additional options
   * @param {string} options.type - Error type from ErrorTypes
   * @param {string} options.severity - Error severity from ErrorSeverity
   * @param {string} options.context - Error context
   * @param {Object} options.data - Additional data
   */
  trackError(error, options = {}) {
    const errorObj = error instanceof Error ? error : new Error(error);
    const type = options.type || ErrorTypes.UNKNOWN;
    const severity = options.severity || ErrorSeverity.ERROR;
    const context = options.context || 'unknown';
    const isCritical = severity === ErrorSeverity.CRITICAL;
    
    // Create error metadata
    const errorMeta = {
      type,
      severity,
      context,
      timestamp: new Date().toISOString(),
      data: options.data || {}
    };
    
    // Format error message
    const formattedMessage = `[${type}] ${context}: ${errorObj.message}`;
    
    // Use the appropriate logging level based on severity
    const logLevel = SEVERITY_TO_LOG_LEVEL[severity];
    
    switch (logLevel) {
      case LogLevel.INFO:
        loggingService.info(formattedMessage, { error: errorObj, meta: errorMeta });
        break;
      case LogLevel.WARN:
        loggingService.warn(formattedMessage, { error: errorObj, meta: errorMeta });
        break;
      case LogLevel.ERROR:
        // Add special handling for critical errors
        if (isCritical) {
          loggingService.error(`CRITICAL: ${formattedMessage}`, { error: errorObj, meta: errorMeta });
        } else {
          loggingService.error(formattedMessage, { error: errorObj, meta: errorMeta });
        }
        break;
      default:
        loggingService.error(formattedMessage, { error: errorObj, meta: errorMeta });
    }
    
    // Send telemetry if enabled and if error is significant enough
    if (this._isTelemetryEnabled && (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL)) {
      this._sendTelemetry(errorObj, errorMeta);
    }
  }
  
  /**
   * Send telemetry data to error tracking service
   * @param {Error} error - Error object
   * @param {Object} meta - Error metadata
   * @private
   */
  _sendTelemetry(error, meta) {
    // Future implementation for remote error reporting
    // This would integrate with an error tracking service
    loggingService.debug('Error telemetry would be sent here', { error, meta });
  }
  
  /**
   * Handle an error with recovery options
   * @param {Error|string} error - Error object or message
   * @param {Object} options - Recovery options
   * @param {Function} options.onRetry - Retry callback
   * @param {Function} options.onFallback - Fallback callback
   * @param {Function} options.onReport - Report callback
   * @returns {Promise<Object>} - Result of recovery action
   */
  async handleError(error, options = {}) {
    // Track the error
    this.trackError(error, options);
    
    // Try using built-in recovery strategies
    
    // 1. Retry if a retry function is provided
    if (typeof options.onRetry === 'function') {
      try {
        loggingService.debug(`Attempting recovery strategy: retry`, {
          error: error instanceof Error ? error.message : error,
          context: options.context
        });
        
        return await options.onRetry();
      } catch (retryError) {
        // If retry fails, log it and continue to fallback
        this.trackError(retryError, { 
          ...options,
          context: `${options.context || 'unknown'}_retry_failed` 
        });
      }
    }
    
    // 2. Use fallback if provided
    if (typeof options.onFallback === 'function') {
      try {
        loggingService.debug(`Attempting recovery strategy: fallback`, {
          error: error instanceof Error ? error.message : error,
          context: options.context
        });
        
        return await options.onFallback();
      } catch (fallbackError) {
        // If fallback fails too, give up
        this.trackError(fallbackError, { 
          ...options,
          context: `${options.context || 'unknown'}_fallback_failed` 
        });
      }
    }
    
    // 3. Report error if a report callback is provided
    if (typeof options.onReport === 'function') {
      try {
        options.onReport(error, options);
      } catch (reportError) {
        loggingService.error('Error in onReport callback', reportError);
      }
    }
    
    // Return default error response
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      type: options.type || ErrorTypes.UNKNOWN,
      context: options.context || 'unknown'
    };
  }
  
  /**
   * Create a contextual error with additional metadata
   * @param {string} message - Error message
   * @param {Object} context - Context information
   * @returns {Error} - Enhanced error object
   */
  createError(message, context = {}) {
    const error = new Error(message);
    error.context = context;
    return error;
  }
}

// Export a singleton instance
export const errorService = new ErrorService();