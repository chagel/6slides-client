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
export enum ErrorTypes {
  EXTRACTION = 'extraction',
  RENDERING = 'rendering',
  STORAGE = 'storage',
  NETWORK = 'network',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

/**
 * Error severities that map to logging levels
 */
export enum ErrorSeverity {
  INFO = 'info',      // Maps to LogLevel.INFO
  WARNING = 'warning', // Maps to LogLevel.WARN
  ERROR = 'error',    // Maps to LogLevel.ERROR
  CRITICAL = 'critical' // Maps to LogLevel.ERROR with special handling
}

/**
 * Maps ErrorSeverity to LogLevel
 * @private
 */
const SEVERITY_TO_LOG_LEVEL: Record<ErrorSeverity, LogLevel> = {
  [ErrorSeverity.INFO]: LogLevel.DEBUG,
  [ErrorSeverity.WARNING]: LogLevel.WARN,
  [ErrorSeverity.ERROR]: LogLevel.ERROR,
  [ErrorSeverity.CRITICAL]: LogLevel.ERROR
};

/**
 * Interface for error tracking options
 */
export interface ErrorTrackingOptions {
  type?: ErrorTypes | string;
  severity?: ErrorSeverity;
  context?: string;
  data?: Record<string, any>;
}

/**
 * Interface for error handling options
 */
export interface ErrorHandlingOptions extends ErrorTrackingOptions {
  onRetry?: () => Promise<any>;
  onFallback?: () => Promise<any>;
  onReport?: (error: Error | string, options: ErrorHandlingOptions) => void;
}

/**
 * Interface for error metadata
 */
export interface ErrorMetadata {
  type: string;
  severity: string;
  context: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Interface for error handling result
 */
export interface ErrorHandlingResult {
  success: boolean;
  error?: string;
  type?: string;
  context?: string;
  [key: string]: any;
}

/**
 * Error with context interface
 */
export interface ErrorWithContext extends Error {
  context?: Record<string, any>;
}

/**
 * Error Service for centralized error handling and recovery strategies
 */
class ErrorService {
  private _isTelemetryEnabled: boolean;

  constructor() {
    this._isTelemetryEnabled = false;
    
    loggingService.debug('ErrorService initialized');
  }
  
  /**
   * Enable or disable error telemetry
   * @param enabled - Whether to enable telemetry
   */
  setTelemetryEnabled(enabled: boolean): void {
    this._isTelemetryEnabled = enabled;
  }
  
  /**
   * Track an error
   * @param error - Error object or message
   * @param options - Additional options
   */
  trackError(error: Error | string, options: ErrorTrackingOptions = {}): void {
    const errorObj = error instanceof Error ? error : new Error(error);
    const type = options.type || ErrorTypes.UNKNOWN;
    const severity = options.severity || ErrorSeverity.ERROR;
    const context = options.context || 'unknown';
    const isCritical = severity === ErrorSeverity.CRITICAL;
    
    // Create error metadata
    const errorMeta: ErrorMetadata = {
      type: type.toString(),
      severity: severity.toString(),
      context,
      timestamp: new Date().toISOString(),
      data: options.data || {}
    };
    
    // Format error message
    const formattedMessage = `[${type}] ${context}: ${errorObj.message}`;
    
    // Use the appropriate logging level based on severity
    const logLevel = SEVERITY_TO_LOG_LEVEL[severity as ErrorSeverity];
    
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
   * @param error - Error object
   * @param meta - Error metadata
   * @private
   */
  private _sendTelemetry(error: Error, meta: ErrorMetadata): void {
    // Future implementation for remote error reporting
    // This would integrate with an error tracking service
    loggingService.debug('Error telemetry would be sent here', { error, meta });
  }
  
  /**
   * Handle an error with recovery options
   * @param error - Error object or message
   * @param options - Recovery options
   * @returns Result of recovery action
   */
  async handleError(error: Error | string, options: ErrorHandlingOptions = {}): Promise<ErrorHandlingResult> {
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
        this.trackError(retryError as Error, { 
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
        this.trackError(fallbackError as Error, { 
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
   * @param message - Error message
   * @param context - Context information
   * @returns Enhanced error object
   */
  createError(message: string, context: Record<string, any> = {}): ErrorWithContext {
    const error = new Error(message) as ErrorWithContext;
    error.context = context;
    return error;
  }
}

// Export a singleton instance
export const errorService = new ErrorService();