/**
 * Type definitions for the storage module
 */

import { Slide } from './index';



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