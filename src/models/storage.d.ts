/**
 * Type definitions for Storage Service
 */

export interface SlideData {
  id: string;
  slides: string[];
}

export interface DebugInfo {
  logs: any[];
  [key: string]: any;
}

export interface ErrorInfo {
  message?: string;
  stack?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface Settings {
  theme?: string;
  transitionStyle?: string;
  controls?: boolean;
  progress?: boolean;
  slideNumber?: boolean;
  customCSS?: string;
  [key: string]: any;
}

export class Storage {
  /**
   * Save slides data (uses IndexedDB for large datasets)
   * @param slides - Array of slide markdown content
   * @returns Promise that resolves when slides are saved
   */
  saveSlides(slides: string[]): Promise<void>;
  
  /**
   * Get slides data
   * @returns Promise that resolves with array of slide markdown content
   */
  getSlides(): Promise<string[]>;
  
  /**
   * Save settings
   * @param settings - Settings object
   * @returns Promise that resolves when settings are saved
   */
  saveSettings(settings: Settings): Promise<void>;
  
  /**
   * Get settings
   * @returns Settings object
   */
  getSettings(): Settings;
  
  /**
   * Save debug info
   * @param info - Debug info object
   */
  saveDebugInfo(info: DebugInfo): void;
  
  /**
   * Get debug info
   * @returns Debug info object
   */
  getDebugInfo(): DebugInfo;
  
  /**
   * Save error info
   * @param error - Error info object
   */
  saveErrorInfo(error: ErrorInfo): void;
  
  /**
   * Clear all stored data
   * @returns Promise that resolves when all data is cleared
   */
  clearAll(): Promise<void>;
}

export const storage: Storage;