/**
 * Notion to Slides - Error Service
 * 
 * Centralized error handling and reporting
 */

import { loggingService } from './LoggingService.js';
import { storage } from '../models/storage.js';

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
 * Error severities
 */
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Error Service for centralized error handling
 */
class ErrorService {
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
    
    // Log the error using LoggingService
    loggingService.error(`[${severity.toUpperCase()}] [${type}] ${context}: ${errorObj.message}`, errorObj);
    
    // Store error info for debugging
    this._storeError({
      message: errorObj.message,
      stack: errorObj.stack,
      type,
      severity,
      context,
      timestamp: new Date().toISOString(),
      data: options.data || {}
    });
    
    // TODO: Add telemetry/reporting in the future
  }
  
  /**
   * Store error information
   * @param {Object} errorInfo - Error information
   * @private
   */
  _storeError(errorInfo) {
    try {
      storage.saveErrorInfo(errorInfo);
    } catch (storeError) {
      // If storing the error fails, just log it
      loggingService.error('Failed to store error info', storeError);
    }
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
        loggingService.debug(`Attempting retry for error: ${error instanceof Error ? error.message : error}`);
        return await options.onRetry();
      } catch (retryError) {
        // If retry fails, continue to fallback
        this.trackError(retryError, { 
          ...options,
          context: `${options.context || 'unknown'}_retry_failed` 
        });
      }
    }
    
    // 2. Use fallback if provided
    if (typeof options.onFallback === 'function') {
      try {
        loggingService.debug(`Using fallback for error: ${error instanceof Error ? error.message : error}`);
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
      options.onReport(error, options);
    }
    
    // Return default error response
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export a singleton instance
export const errorService = new ErrorService();