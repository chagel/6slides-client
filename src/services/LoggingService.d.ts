/**
 * Type definitions for Logging Service
 */

export const enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LoggingConfig {
  enabled?: boolean;
  debugEnabled?: boolean;
  logLevel?: string;
  prefix?: string;
  storeDebugLogs?: boolean;
  logConsole?: boolean;
  maxStoredLogs?: number;
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  errorMessage?: string;
  stack?: string;
  errorProps?: Record<string, unknown>;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

export interface LogFilterOptions {
  level?: string;
  context?: string;
  limit?: number;
}

export class LoggingService {
  initialize(config?: LoggingConfig): void;
  setDebugLogging(enabled: boolean): void;
  isDebugLoggingEnabled(): boolean;
  setStoreDebugLogs(enabled: boolean): void;
  setLogLevel(level: string): void;
  setConsoleLogging(enabled: boolean): void;
  
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
  
  getStoredLogs(): LogEntry[];
  getFilteredLogs(options?: LogFilterOptions): LogEntry[];
  clearStoredLogs(): void;
}

export const loggingService: LoggingService;