/**
 * Six Slides - Logging Service
 * 
 * Centralized logging functionality with support for different levels.
 * Provides core logging capabilities for the entire application.
 */

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
  private _maxStoredLogs: number;

  constructor() {
    // Default configuration
    this._enabled = true;       // Master switch for all logging
    this._debugEnabled = true;  // Debug-level logging enabled for development
    this._logLevel = LogLevel.DEBUG;
    this._prefix = '[Six Slides]';
    this._maxStoredLogs = 100;    // Maximum number of logs to keep in storage
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
    if (typeof config.maxStoredLogs === 'number') this._maxStoredLogs = config.maxStoredLogs;
    
    this.debug('Logging service initialized', { 
      debugEnabled: this._debugEnabled,
      logLevel: this._logLevel
    });
  }

  /**
   * Enable or disable debug logging
   * @param enabled - Whether debug logging should be enabled
   */
  setDebugLogging(enabled: boolean | string): void {
    const isEnabled = enabled === true || enabled === 'true';
    this._debugEnabled = isEnabled;
    this.debug(`Debug logging ${isEnabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get the current debug logging state
   * @returns Whether debug logging is enabled
   */
  isDebugLoggingEnabled(): boolean {
    return this._debugEnabled;
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
    if (!this._enabled || !this._debugEnabled) return;
    
    this._storeLog({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this._summarizeData(data) : undefined,
      metadata: {
        context: context || this._getContextType()
      }
    });
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to include
   * @param context - Optional explicit context to override automatic detection
   */
  info(message: string, data?: unknown, context?: string): void {
    if (!this._enabled) return;
    
    this._storeLog({
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this._summarizeData(data) : undefined,
      metadata: {
        context: context || this._getContextType()
      }
    });
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to include
   * @param context - Optional explicit context to override automatic detection
   */
  warn(message: string, data?: unknown, context?: string): void {
    if (!this._enabled) return;
    
    this._storeLog({
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this._summarizeData(data) : undefined,
      metadata: {
        context: context || this._getContextType()
      }
    });
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param data - Optional error object or data
   * @param context - Optional explicit context to override automatic detection
   */
  error(message: string, data?: unknown, context?: string): void {
    if (!this._enabled) return;
    
    const contextValue = context || this._getContextType();
    
    // Extract error properties for storage
    let errorMessage: string | undefined;
    let stack: string | undefined;
    let errorProps: Record<string, unknown> | undefined;
    
    if (data instanceof Error) {
      errorMessage = data.message;
      stack = data.stack;
      
      // Collect additional error properties
      errorProps = {};
      for (const key in data) {
        if (key !== 'message' && key !== 'stack') {
          errorProps[key] = (data as any)[key];
        }
      }
      if (Object.keys(errorProps).length === 0) {
        errorProps = undefined;
      }
    }
    
    this._storeLog({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      errorMessage,
      stack,
      errorProps,
      data: data instanceof Error ? undefined : this._summarizeData(data),
      metadata: {
        context: contextValue
      }
    });
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

  /**
   * Store a log entry using chrome.storage.local
   * @param logEntry - Log entry to store
   * @private
   */
  private _storeLog(logEntry: LogEntry): void {
    try {
      // Ensure the entry has a timestamp
      logEntry.timestamp = logEntry.timestamp || new Date().toISOString();
      
      // Generate a unique ID for the log entry
      const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Use chrome.storage.local to store the log
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // First, get existing logs
        chrome.storage.local.get(['logs'], (result) => {
          let logs = result.logs || [];
          
          // Add new log entry
          logs.push({
            id,
            ...logEntry
          });
          
          // Limit the number of stored logs
          if (logs.length > this._maxStoredLogs) {
            logs = logs.slice(-this._maxStoredLogs);
          }
          
          // Save back to storage
          chrome.storage.local.set({ logs }, () => {
            // Errors handled silently - this is the logging system itself
          });
        });
      }
    } catch (_) {
      // No further logging here to avoid potential infinite loops
    }
  }

  /**
   * Get the current execution context type
   * @returns Context type string
   * @private
   */
  private _getContextType(): string {
    try {
      // First check if we're in a service worker context
      if (typeof self !== 'undefined' && typeof window === 'undefined' && 
          typeof chrome !== 'undefined' && chrome.runtime) {
        return 'service_worker';
      }
      
      // If we have a window object, check the URL
      if (typeof window !== 'undefined' && window.location) {
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
        }
      }
      
      // Content script or other context
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return 'content_script';
      }
      
      // Fallback for unknown contexts
      return 'unknown';
    } catch (error) {
      // If any error occurs (like window not being defined), assume it's a service worker
      return 'service_worker';
    }
  }

  /**
   * Get logs from chrome.storage
   * @param options - Filter options
   * @returns Promise resolving to filtered logs
   */
  async getLogs(options: LogFilterOptions = {}): Promise<LogEntry[]> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['logs'], (result) => {
          let logs: LogEntry[] = result.logs || [];
          
          // Apply filters
          if (options.level) {
            logs = logs.filter((log: LogEntry) => log.level === options.level);
          }
          
          if (options.context) {
            logs = logs.filter((log: LogEntry) => 
              log.metadata && log.metadata.context === options.context
            );
          }
          
          // Sort by timestamp (newest first)
          logs.sort((a: LogEntry, b: LogEntry) => {
            const aTime = a.timestamp || '';
            const bTime = b.timestamp || '';
            return bTime.localeCompare(aTime);
          });
          
          // Apply limit
          if (options.limit && logs.length > options.limit) {
            logs = logs.slice(0, options.limit);
          }
          
          resolve(logs);
        });
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Clear all stored logs
   * @returns Promise that resolves when logs are cleared
   */
  async clearLogs(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove(['logs'], () => {
          // Errors handled silently - this is the logging system itself
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export a singleton instance
export const loggingService = new LoggingService();
