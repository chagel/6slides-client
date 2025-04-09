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
  error?: string | Error; // Additional error field for compatibility
  context?: string; // Direct context property for compatibility
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
   * @param context - Optional explicit context to override automatic detection
   */
  debug(message: string, data?: unknown, context?: string): void {
    // Always log to console regardless of debug setting
    console.debug(`[${context || this._getContextType()}] ${message}`, data || '');
    
    // We want to save ALL debug logs to storage, regardless of debug mode
    // This ensures critical logs are captured and can be viewed in the log viewer
    
    // Create metadata with context if provided
    const metadata = context ? { context } : undefined;
    
    // Create a log entry manually to bypass normal filtering
    const logEntry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...(metadata || {}),
        context: context || this._getContextType(),
        timestamp: new Date().toISOString()
      }
    };
    
    // Add data if provided
    if (data !== undefined) {
      logEntry.data = this._summarizeData(data);
    }
    
    // Store the log directly
    this._storeLog(logEntry);
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to include
   * @param context - Optional explicit context to override automatic detection
   */
  info(message: string, data?: unknown, context?: string): void {
    // Always log to console regardless of level setting
    console.info(`[${context || this._getContextType()}] ${message}`, data || '');
    
    // Create metadata with context if provided
    const metadata = context ? { context } : undefined;
    
    // Create a log entry manually to bypass normal filtering
    const logEntry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...(metadata || {}),
        context: context || this._getContextType(),
        timestamp: new Date().toISOString()
      }
    };
    
    // Add data if provided
    if (data !== undefined) {
      logEntry.data = this._summarizeData(data);
    }
    
    // Store the log directly
    this._storeLog(logEntry);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to include
   * @param context - Optional explicit context to override automatic detection
   */
  warn(message: string, data?: unknown, context?: string): void {
    // Always log to console regardless of level setting
    console.warn(`[${context || this._getContextType()}] ${message}`, data || '');
    
    // Create metadata with context if provided
    const metadata = context ? { context } : undefined;
    
    // Create a log entry manually to bypass normal filtering
    const logEntry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...(metadata || {}),
        context: context || this._getContextType(),
        timestamp: new Date().toISOString()
      }
    };
    
    // Add data if provided
    if (data !== undefined) {
      logEntry.data = this._summarizeData(data);
    }
    
    // Store the log directly
    this._storeLog(logEntry);
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param data - Optional error object or data
   * @param context - Optional explicit context to override automatic detection
   */
  error(message: string, data?: unknown, context?: string): void {
    // Extract error if it's in the data.error property (from ErrorService)
    const error: any = data;
    const contextValue = context || this._getContextType();
    
    // Always log errors to console regardless of mode
    console.error(`[${contextValue}] ${this._prefix} ${message}`, data || '');
    
    // Log stack trace for errors
    if (error && (error as Error).stack) {
      console.error(`[${contextValue}] Stack trace:`, (error as Error).stack);
    }
    
    // Extract error properties to include in log
    let errorMessage: string | undefined;
    let stack: string | undefined;
    let errorProps: Record<string, unknown> | undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      stack = error.stack;
      
      // Collect additional error properties
      errorProps = {};
      for (const key in error) {
        if (key !== 'message' && key !== 'stack') {
          errorProps[key] = (error as any)[key];
        }
      }
      if (Object.keys(errorProps).length === 0) {
        errorProps = undefined;
      }
    }
    
    // Create log entry directly
    const logEntry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      // Include error details in log entry
      errorMessage,
      stack,
      errorProps,
      metadata: {
        context: contextValue,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add data if it's not the error itself
    if (data !== undefined && data !== error) {
      logEntry.data = this._summarizeData(data);
    }
    
    // Store the log directly
    this._storeLog(logEntry);
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
    // If we're explicitly told to store debug logs, store all log levels
    if (this._storeDebugLogs) {
      return true;
    }
    
    // Even if not storing debug logs generally, always store errors
    if (level === LogLevel.ERROR) {
      return true;
    }
    
    return false;
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
      // Get existing metadata or create empty object
      const existingMetadata = logEntry.metadata || {};
      
      // Add context information to the log - only use auto-detection if no explicit context
      logEntry.metadata = {
        ...existingMetadata,
        // Only use auto-detected context if no explicit context was provided
        context: existingMetadata.context || this._getContextType(),
        timestamp: new Date().toISOString()
      };
      
      // Log to console with context info for debugging
      if (this._logConsole && this._debugEnabled) {
        console.debug(
          `[${logEntry.metadata.context}] [${logEntry.level}] ${logEntry.message}`, 
          logEntry.data || ''
        );
      }
      
      // Save directly to localStorage without going through storage service
      // This ensures consistent access across different page contexts
      this._saveLogDirectly(logEntry);
      
      // Also save via regular storage for backward compatibility
      const currentLogs = this._getStoredLogs();
      currentLogs.unshift(logEntry);
      if (currentLogs.length > this._maxStoredLogs) {
        currentLogs.length = this._maxStoredLogs;
      }
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
   * Save log directly to IndexedDB for cross-page access
   * @param logEntry - Log entry to save
   * @private
   */
  private _saveLogDirectly(logEntry: LogEntry): void {
    // Use the existing IDB infrastructure already in the storage module
    // This is more reliable than implementing a separate IDB system here
    
    try {
      // Use our helper method that batches log saves efficiently
      this._saveLogToIDB(logEntry);
    } catch (error) {
      console.error('Failed to save log directly to IDB', error);
      
      // Fallback to localStorage if IDB fails
      this._saveLogToLocalStorage(logEntry);
    }
  }
  
  /**
   * Save log entry to IndexedDB using the storage module
   * @param logEntry - Log entry to save
   * @private
   */
  private _saveLogToIDB(logEntry: LogEntry): void {
    // Force console logging in dev mode to track log saving operations
    console.debug('[LoggingService] Saving log to IndexedDB:', {
      context: logEntry.metadata?.context || 'unknown',
      level: logEntry.level,
      message: logEntry.message
    });
    
    // Ensure log has a context if it doesn't already
    if (!logEntry.metadata || !logEntry.metadata.context) {
      logEntry.metadata = {
        ...(logEntry.metadata || {}),
        context: this._getContextType()
      };
    }
    
    // Ensure log has a timestamp
    logEntry.timestamp = logEntry.timestamp || new Date().toISOString();
    
    // Use our helper method that batches log saves efficiently
    try {
      // Create a direct log entry copy to ensure it's completely standalone
      const directLog = {
        ...logEntry,
        // Ensure metadata is properly structured
        metadata: {
          ...(logEntry.metadata || {}),
          timestamp: logEntry.timestamp,
          // Use explicit context if provided, or get from environment
          context: logEntry.metadata?.context || this._getContextType()
        }
      };
      
      // Save directly to avoid any transformation or filtering
      storage.saveDebugLog(directLog).catch(err => {
        console.error('Failed to save log to IDB', err);
      });
    } catch (error) {
      console.error('Failed to save log to IDB', error);
      
      // Fallback to localStorage if IDB fails
      this._saveLogToLocalStorage(logEntry);
    }
  }
  
  /**
   * Fallback method to save logs to localStorage
   * @param logEntry - Log entry to save
   * @private
   */
  private _saveLogToLocalStorage(logEntry: LogEntry): void {
    try {
      // Use a special key that's consistent across all contexts
      const CROSS_PAGE_LOG_KEY = 'notion_slides_debug_logs';
      
      // Get existing logs
      let logs: LogEntry[] = [];
      const existingLogsJson = localStorage.getItem(CROSS_PAGE_LOG_KEY);
      
      if (existingLogsJson) {
        try {
          logs = JSON.parse(existingLogsJson);
          if (!Array.isArray(logs)) logs = [];
        } catch (e) {
          // If parsing fails, start with empty array
          logs = [];
        }
      }
      
      // Add new log at the beginning (most recent first)
      logs.unshift(logEntry);
      
      // Limit array size
      if (logs.length > this._maxStoredLogs) {
        logs.length = this._maxStoredLogs;
      }
      
      // Save back to localStorage
      localStorage.setItem(CROSS_PAGE_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log to localStorage', error);
    }
  }
  
  /**
   * Get the current context type
   * @returns Context type string
   * @private
   */
  private _getContextType(): string {
    // Determine context based on URL or other environment factors
    const url = window.location.href || '';
    
    if (url.includes('viewer.html')) {
      return 'viewer';
    } else if (url.includes('popup.html')) {
      return 'popup';
    } else if (url.includes('about.html')) {
      return 'about';
    } else if (url.includes('settings.html')) {
      return 'settings';
    } else if (url.includes('components/sidebar.html')) {
      return 'sidebar';
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
      return 'content_script';
    } else {
      return 'unknown';
    }
  }

  /**
   * Get stored logs
   * @returns Array of log entries
   * @private
   */
  private async _fetchLogsFromIDB(): Promise<LogEntry[]> {
    try {
      // Get the most recent 200 logs from IndexedDB
      const logs = await storage.getDebugLogs(200);
      return logs;
    } catch (error) {
      console.error('Error fetching logs from IndexedDB', error);
      return [];
    }
  }
  
  private _getStoredLogs(): LogEntry[] {
    try {
      // Since IndexedDB is asynchronous but we need a synchronous return,
      // we use localStorage as a cache to provide fast access to recent logs
      
      // First get logs from localStorage
      const CROSS_PAGE_LOG_KEY = 'notion_slides_debug_logs';
      const directLogsJson = localStorage.getItem(CROSS_PAGE_LOG_KEY);
      let directLogs: LogEntry[] = [];
      
      if (directLogsJson) {
        try {
          directLogs = JSON.parse(directLogsJson);
          if (!Array.isArray(directLogs)) directLogs = [];
        } catch (e) {
          console.error('Error parsing direct logs', e);
          directLogs = [];
        }
      }
      
      // Asynchronously refresh from IndexedDB for next time
      this._fetchLogsFromIDB().then(idbLogs => {
        if (idbLogs.length > 0) {
          localStorage.setItem(CROSS_PAGE_LOG_KEY, JSON.stringify(idbLogs));
          console.log(`Updated localStorage with ${idbLogs.length} logs from IndexedDB`);
        }
      }).catch(e => console.error('Failed to refresh logs from IDB', e));
      
      return directLogs;
    } catch (error) {
      console.error('Error getting stored logs', error);
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
      // Clear logs in regular storage
      storage.saveDebugInfo({ logs: [] });
      
      // Clear logs in direct storage
      const CROSS_PAGE_LOG_KEY = 'notion_slides_debug_logs';
      localStorage.removeItem(CROSS_PAGE_LOG_KEY);
      
      this.debug('Debug logs cleared from all storage locations');
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