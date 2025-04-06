/**
 * Notion to Slides - Logging Service
 * 
 * Centralized logging functionality with support for different levels and destinations.
 * Provides core logging capabilities for the entire application.
 * 
 * Note: LoggingService is used as a singleton through direct imports throughout the
 * codebase for simplicity. It provides fundamental logging capabilities that other
 * components rely on.
 */

import { storage } from '../models/storage';

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  enabled?: boolean;
  debugEnabled?: boolean;
  logLevel?: LogLevel;
  prefix?: string;
  storeDebugLogs?: boolean;
  logConsole?: boolean;
  maxStoredLogs?: number;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  errorMessage?: string;
  stack?: string;
  errorProps?: Record<string, unknown>;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Log filter options interface
 */
export interface LogFilterOptions {
  level?: LogLevel;
  context?: string;
  limit?: number;
}

/**
 * Logging Service for centralized logging management
 */
class LoggingService {
  private _enabled: boolean;
  private _debugEnabled: boolean;
  private _logLevel: LogLevel;
  private _prefix: string;
  private _storeDebugLogs: boolean;
  private _maxStoredLogs: number;
  private _logConsole: boolean;

  constructor() {
    // Default configuration - all logging is silenced by default
    this._enabled = true;       // Master switch for all logging
    this._debugEnabled = false; // Debug-level logging
    this._logLevel = LogLevel.INFO;
    this._prefix = '[Notion Slides]';
    this._storeDebugLogs = false; // Whether to store debug logs in localStorage/IndexedDB
    this._maxStoredLogs = 100;    // Maximum number of logs to keep in storage
    this._logConsole = false;     // Console logging disabled by default for production
  }

  /**
   * Initialize the logging service with configuration
   * @param config - Logging configuration
   */
  initialize(config: LoggingConfig = {}): void {
    if (typeof config.enabled === 'boolean') this._enabled = config.enabled;
    if (typeof config.debugEnabled === 'boolean') this._debugEnabled = config.debugEnabled;
    if (config.logLevel) this._logLevel = config.logLevel;
    if (config.prefix) this._prefix = config.prefix;
    if (typeof config.storeDebugLogs === 'boolean') this._storeDebugLogs = config.storeDebugLogs;
    if (typeof config.logConsole === 'boolean') this._logConsole = config.logConsole;
    if (typeof config.maxStoredLogs === 'number') this._maxStoredLogs = config.maxStoredLogs;
    
    // The debug method has its own checks for debugEnabled and will not log if it's false
    this.debug('Logging service initialized', { 
      debugEnabled: this._debugEnabled,
      logLevel: this._logLevel,
      storeDebugLogs: this._storeDebugLogs,
      logConsole: this._logConsole
    });
  }

  /**
   * Enable or disable debug logging
   * @param enabled - Whether debug logging should be enabled
   */
  setDebugLogging(enabled: boolean): void {
    this._debugEnabled = enabled;
    // The debug method itself checks if debugEnabled is true before logging
    this.debug(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the current debug logging state
   * @returns Whether debug logging is enabled
   */
  isDebugLoggingEnabled(): boolean {
    return this._debugEnabled;
  }

  /**
   * Set whether to store debug logs
   * @param enabled - Whether to store debug logs
   */
  setStoreDebugLogs(enabled: boolean): void {
    this._storeDebugLogs = enabled;
    this.debug(`Debug log storage ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set the minimum log level
   * @param level - Log level from LogLevel
   */
  setLogLevel(level: LogLevel): void {
    if (Object.values(LogLevel).includes(level)) {
      this._logLevel = level;
      this.debug(`Log level set to ${level}`);
    }
  }

  /**
   * Log a debug message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  debug(message: string, data?: unknown): void {
    if (!this._enabled || !this._debugEnabled) return;
    
    this._logMessage(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  info(message: string, data?: unknown): void {
    if (!this._enabled || this._getSeverityValue(this._logLevel) > this._getSeverityValue(LogLevel.INFO)) {
      return;
    }
    
    this._logMessage(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  warn(message: string, data?: unknown): void {
    if (!this._enabled || this._getSeverityValue(this._logLevel) > this._getSeverityValue(LogLevel.WARN)) {
      return;
    }
    
    this._logMessage(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param data - Optional error object or data
   */
  error(message: string, data?: unknown): void {
    if (!this._enabled) return;
    
    // Extract error if it's in the data.error property (from ErrorService)
    let error: any = data;
    let metadata: Record<string, unknown> | undefined = undefined;
    
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (dataObj.error) {
        error = dataObj.error;
        metadata = (dataObj.meta as Record<string, unknown>) || {}; // Use provided metadata if available
      }
    }
    
    this._logMessage(LogLevel.ERROR, message, data, error, metadata);
  }

  /**
   * Internal logging method
   * @param level - Log level
   * @param message - Message to log
   * @param data - Optional data
   * @param error - Optional error object 
   * @param metadata - Optional metadata
   * @private
   */
  private _logMessage(
    level: LogLevel, 
    message: string, 
    data?: unknown, 
    error?: unknown, 
    metadata?: Record<string, unknown>
  ): void {
    const fullMessage = `${this._prefix} ${message}`;
    const timestamp = new Date().toISOString();
    
    // Log to console if enabled
    if (this._logConsole) {
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
          
          // Log stack trace for errors
          if (error && (error as Error).stack) {
            console.error('Stack trace:', (error as Error).stack);
          }
          break;
        default:
          console.log(fullMessage, data || '');
      }
    }
    
    // Store log if enabled for this level
    if (this._shouldStoreLog(level)) {
      const logEntry: Partial<LogEntry> = {
        level,
        message,
        timestamp
      };
      
      // Extract error properties if available
      if (error instanceof Error) {
        logEntry.errorMessage = error.message;
        logEntry.stack = error.stack;
        
        // Add any additional properties from the error
        const errorProps: Record<string, unknown> = {};
        for (const key in error) {
          if (key !== 'message' && key !== 'stack') {
            errorProps[key] = (error as any)[key];
          }
        }
        
        if (Object.keys(errorProps).length > 0) {
          logEntry.errorProps = errorProps;
        }
      }
      
      // Add data if available (summarized to avoid large objects)
      if (data !== undefined && data !== null) {
        if (data !== error) { // Don't duplicate error data
          logEntry.data = this._summarizeData(data);
        }
      }
      
      // Add metadata if available
      if (metadata) {
        logEntry.metadata = metadata;
      }
      
      this._storeLog(logEntry as LogEntry);
    }
  }

  /**
   * Determine if this log level should be stored
   * @param level - Log level
   * @returns Whether to store this log
   * @private
   */
  private _shouldStoreLog(level: LogLevel): boolean {
    // Always store errors
    if (level === LogLevel.ERROR) {
      return true;
    }
    
    // For other levels, check if debug logs are enabled
    return this._storeDebugLogs;
  }

  /**
   * Summarize data to avoid storing large objects
   * @param data - Data to summarize
   * @returns Summarized data
   * @private
   */
  private _summarizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }
    
    // Handle errors
    if (data instanceof Error) {
      return {
        message: data.message,
        name: data.name,
        stack: data.stack
      };
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length <= 5) {
        return data.map(item => this._summarizeData(item));
      }
      return {
        _summary: `Array with ${data.length} items`,
        _sample: data.slice(0, 5).map(item => this._summarizeData(item))
      };
    }
    
    // Handle objects but avoid circular references
    if (typeof data === 'object') {
      // Don't process DOM elements or nodes - just indicate their type
      if (typeof Node !== 'undefined' && data instanceof Node) {
        return `[${(data as Node).nodeName || 'DOM Node'}]`;
      }
      
      // Check for HTML elements specifically (safer cross-context check)
      if (data && 
          (data as HTMLElement).nodeType && 
          (data as HTMLElement).nodeName) {
        return `[${(data as HTMLElement).nodeName || 'DOM Element'}]`;
      }
      
      // For other objects, extract key info
      try {
        const summary: Record<string, unknown> = {};
        const keys = Object.keys(data as object);
        
        if (keys.length <= 10) {
          // For small objects, include all properties (summarized)
          for (const key of keys) {
            if (typeof (data as Record<string, unknown>)[key] !== 'function') {
              summary[key] = this._summarizeData((data as Record<string, unknown>)[key]);
            }
          }
        } else {
          // For large objects, just summarize
          summary._summary = `Object with ${keys.length} properties`;
          summary._keys = keys.slice(0, 10);
          summary._sample = {};
          
          // Include a few sample properties
          for (const key of keys.slice(0, 5)) {
            if (typeof (data as Record<string, unknown>)[key] !== 'function') {
              (summary._sample as Record<string, unknown>)[key] = 
                this._summarizeData((data as Record<string, unknown>)[key]);
            }
          }
        }
        
        return summary;
      } catch (e) {
        return '[Object]';
      }
    }
    
    // For primitive types, return as is
    return data;
  }

  // No need for setStorageService as we're using direct import
  
  /**
   * Set console logging enabled state
   * @param enabled - Whether to log to console
   */
  setConsoleLogging(enabled: boolean): void {
    this._logConsole = enabled;
    this.debug(`Console logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  private _storeLog(logEntry: LogEntry): void {
    try {
      const currentLogs = this._getStoredLogs();
      
      // Add new log and limit the array size
      currentLogs.unshift(logEntry);
      if (currentLogs.length > this._maxStoredLogs) {
        currentLogs.length = this._maxStoredLogs;
      }
      
      // Save logs using storage service
      storage.saveDebugInfo({ logs: currentLogs });
    } catch (error) {
      // Don't use this.error to avoid potential infinite recursion
      // Only log critical errors when console is enabled
      if (this._logConsole) {
        console.error(`${this._prefix} Failed to store log`, error);
      }
    }
  }

  /**
   * Get stored logs
   * @returns Array of log entries
   * @private
   */
  private _getStoredLogs(): LogEntry[] {
    try {
      // Get debug info from storage
      const debugInfo = storage.getDebugInfo();
      return Array.isArray(debugInfo?.logs) ? debugInfo.logs : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all stored logs
   * @returns Array of log entries
   */
  getStoredLogs(): LogEntry[] {
    return this._getStoredLogs();
  }

  /**
   * Get filtered logs by level and/or context
   * @param options - Filter options
   * @returns Filtered log entries
   */
  getFilteredLogs(options: LogFilterOptions = {}): LogEntry[] {
    const logs = this._getStoredLogs();
    
    // Apply filters
    let filtered = logs;
    
    if (options.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }
    
    if (options.context && filtered.length > 0) {
      filtered = filtered.filter(log => {
        // Check if context exists in metadata
        return log.metadata && log.metadata.context === options.context;
      });
    }
    
    // Apply limit
    if (options.limit && filtered.length > options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    try {
      // Clear logs in storage
      storage.saveDebugInfo({ logs: [] });
      
      this.debug('Debug logs cleared');
    } catch (error) {
      // Only log when console logging is enabled
      if (this._logConsole) {
        console.error(`${this._prefix} Failed to clear logs`, error);
      }
    }
  }

  /**
   * Convert log level to numeric severity value for comparison
   * @param level - Log level
   * @returns Severity value
   * @private
   */
  private _getSeverityValue(level: LogLevel): number {
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