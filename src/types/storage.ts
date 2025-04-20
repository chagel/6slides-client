/**
 * Type definitions for the storage module
 */

import { Slide } from './index';

/**
 * Debug info structure
 */
export interface DebugInfo {
  /** Timestamp of the debug info */
  timestamp?: string;
  /** Source type of the content */
  sourceType?: string;
  /** URL of the source */
  url?: string;
  /** Count of slides in the presentation */
  slideCount?: number;
  /** Title of the presentation */
  title?: string;
  /** Array of log entries */
  logs: any[];
}

/**
 * Error info structure
 */
export interface ErrorInfo {
  /** Error message */
  message: string;
  /** Error type */
  type?: string;
  /** Error context */
  context?: string;
  /** Additional error data */
  data?: Record<string, unknown>;
  /** Error stack trace */
  stack?: string;
  /** Timestamp when the error occurred */
  timestamp?: string;
}

/**
 * Settings structure
 */
export interface Settings {
  /** Theme setting */
  theme?: string;
  /** Debug mode enabled */
  debugEnabled?: boolean;
  /** Other settings as key-value pairs */
  [key: string]: unknown;
}