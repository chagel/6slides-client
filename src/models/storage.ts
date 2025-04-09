/**
 * Notion to Slides - Storage Module
 * 
 * Handles data persistence using localStorage with fallback to IndexedDB for large data
 */

import { loggingService } from '../services/logging_service';
import { Slide } from '../types/index';
import { DebugInfo, ErrorInfo, Settings } from '../types/storage';

// IndexedDB database name and version
const DB_NAME = 'notionSlides';
const DB_VERSION = 3; // Increased version to add new indexes for logs store
const SLIDES_STORE = 'slides';
const SETTINGS_STORE = 'settings';
const LOGS_STORE = 'logs';

// Size threshold in bytes before using IndexedDB instead of localStorage (1MB)
const SIZE_THRESHOLD = 1 * 1024 * 1024; 

/**
 * IndexedDB Slide data interface
 */
interface SlideData {
  id: string;
  slides: Slide[];
}

/**
 * Storage class that provides a unified API for localStorage, chrome.storage, and IndexedDB
 */
class Storage {
  private isServiceWorker: boolean;

  constructor() {
    // Detect if we're running in a service worker context (no window object)
    this.isServiceWorker = typeof window === 'undefined' || 
                          !!(typeof globalThis !== 'undefined' && 
                             (globalThis as any).ServiceWorkerGlobalScope);
  }
  
  /**
   * Save slides data (uses IndexedDB for large datasets)
   * @param slides - Array of slide objects
   * @returns Promise resolving when save completes
   */
  async saveSlides(slides: Slide[]): Promise<void> {
    try {
      const data = JSON.stringify(slides);
      
      // Check data size
      const dataSize = new Blob([data]).size;
      
      if (this.isServiceWorker) {
        // Use chrome.storage.local in service worker
        return new Promise((resolve, reject) => {
          chrome.storage.local.set({ slides: data }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
      
      // Use localStorage for small data, IndexedDB for large data
      if (dataSize < SIZE_THRESHOLD) {
        loggingService.debug(`Saving ${slides.length} slides to localStorage (${dataSize} bytes)`);
        localStorage.setItem('slides', data);
        return Promise.resolve();
      } else {
        loggingService.debug(`Saving ${slides.length} slides to IndexedDB (${dataSize} bytes)`);
        return this._saveToIndexedDB(SLIDES_STORE, { id: 'current', slides });
      }
    } catch (error) {
      loggingService.error('Failed to save slides', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get slides data
   * @returns Promise resolving to array of slide objects
   */
  async getSlides(): Promise<Slide[]> {
    try {
      if (this.isServiceWorker) {
        // Use chrome.storage.local in service worker
        return new Promise((resolve, reject) => {
          chrome.storage.local.get(['slides'], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (result.slides) {
              resolve(JSON.parse(result.slides));
            } else {
              resolve([]);
            }
          });
        });
      }
      
      // First try localStorage
      const localData = localStorage.getItem('slides');
      
      if (localData) {
        const slides = JSON.parse(localData) as Slide[];
        loggingService.debug(`Retrieved ${slides.length} slides from localStorage`);
        return slides;
      }
      
      // If not in localStorage, try IndexedDB
      const dbData = await this._getFromIndexedDB(SLIDES_STORE, 'current') as SlideData | null;
      
      if (dbData && dbData.slides) {
        loggingService.debug(`Retrieved ${dbData.slides.length} slides from IndexedDB`);
        return dbData.slides;
      }
      
      // No slides found
      loggingService.debug('No slides found in storage');
      return [];
    } catch (error) {
      loggingService.error('Failed to get slides', error);
      return [];
    }
  }
  
  /**
   * Save settings
   * @param settings - Settings object
   * @returns Promise resolving when save completes
   */
  saveSettings(settings: Settings): Promise<void> {
    try {
      const settingsData = JSON.stringify(settings);
      
      if (this.isServiceWorker) {
        // Use chrome.storage.local in service worker
        return new Promise((resolve, reject) => {
          chrome.storage.local.set({ notionSlidesSettings: settingsData }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              loggingService.debug('Settings saved to chrome.storage.local', settings);
              resolve();
            }
          });
        });
      }
      
      localStorage.setItem('notionSlidesSettings', settingsData);
      loggingService.debug('Settings saved to localStorage', settings);
      return Promise.resolve();
    } catch (error) {
      loggingService.error('Failed to save settings', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get settings
   * @returns Settings object
   */
  getSettings(): Settings {
    try {
      if (this.isServiceWorker) {
        // In service worker context, just return default settings
        // Chrome extension service workers can't use synchronous XHR
        return {
          theme: "default",
          transition: "slide",
          slideNumber: false,
          center: true,
          debugLogging: false,
          extractionTimeout: 30
        };
      }
      
      const settings = JSON.parse(localStorage.getItem('notionSlidesSettings') || '{}') as Settings;
      return settings;
    } catch (error) {
      loggingService.error('Failed to get settings', error);
      return {};
    }
  }
  
  /**
   * Save a single debug log entry to IndexedDB
   * @param logEntry - The log entry to save
   * @returns Promise that resolves when save is complete
   */
  async saveDebugLog(logEntry: any): Promise<void> {
    try {
      if (this.isServiceWorker) {
        console.debug('Debug log in service worker:', logEntry);
        return;
      }
      
      // Ensure log entry has a timestamp if not already present
      if (!logEntry.timestamp) {
        logEntry.timestamp = new Date().toISOString();
      }
      
      // Ensure metadata exists
      if (!logEntry.metadata) {
        logEntry.metadata = {};
      }
      
      // Ensure context metadata exists
      if (!logEntry.metadata.context) {
        // Try to determine context from window.location if available
        try {
          const url = window.location.href || '';
          let context = 'unknown';
          
          if (url.includes('viewer.html')) {
            context = 'viewer';
          } else if (url.includes('popup.html')) {
            context = 'popup';
          } else if (url.includes('about.html')) {
            context = 'about';
          } else if (url.includes('settings.html')) {
            context = 'settings';
          } else if (url.includes('components/sidebar.html')) {
            context = 'sidebar';
          } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            context = 'content_script';
          }
          
          logEntry.metadata.context = context;
        } catch (e) {
          logEntry.metadata.context = 'unknown';
        }
      }
      
      // Clean debug logging to console
      console.log(`[${logEntry.metadata.context}] ${logEntry.message}`);
      
      // Generate a more deterministic ID for the log entry to help prevent duplicates
      // This creates a hash based on content that will be consistent for identical logs
      const idComponents = [
        logEntry.timestamp,
        logEntry.level,
        logEntry.message,
        logEntry.metadata.context
      ];
      
      // Create a simple hash from these components to use as ID
      const idBase = idComponents.join('|');
      const simpleHash = btoa(idBase).replace(/[/+=]/g, '').substring(0, 20);
      logEntry.id = simpleHash;
      
      // Save to IndexedDB using put - this will automatically replace identical logs
      // rather than creating duplicates, because we're using a content-based ID
      await this._saveToIndexedDB(LOGS_STORE, logEntry);
      
      // Update localStorage cache
      this._updateLocalStorageLogCache(logEntry);
    } catch (error) {
      console.error('Failed to save debug log to IndexedDB', error);
    }
  }
  
  
  
  /**
   * Update localStorage cache with new log entry
   * @param logEntry - Log entry to add to cache
   * @private
   */
  private _updateLocalStorageLogCache(logEntry: any): void {
    try {
      // Get current logs from localStorage
      const CROSS_PAGE_LOG_KEY = 'notion_slides_debug_logs';
      let logs: any[] = [];
      
      // Try to get existing logs
      const logsJson = localStorage.getItem(CROSS_PAGE_LOG_KEY);
      if (logsJson) {
        try {
          logs = JSON.parse(logsJson);
          if (!Array.isArray(logs)) logs = [];
        } catch (e) {
          logs = [];
        }
      }
      
      // Add new log to beginning (newest first)
      logs.unshift(logEntry);
      
      // Keep only last 100 logs in localStorage to avoid storage issues
      if (logs.length > 100) {
        logs.length = 100;
      }
      
      // Save updated logs back to localStorage
      localStorage.setItem(CROSS_PAGE_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to update localStorage log cache', error);
    }
  }

  /**
   * Save debug info
   * @param info - Debug info object
   */
  saveDebugInfo(info: Partial<DebugInfo>): void {
    try {
      if (this.isServiceWorker) {
        // In service worker, just log but don't try to save
        console.debug('Debug info in service worker:', info);
        return;
      }
      
      // Get existing debug info
      const existingDebugInfo = this.getDebugInfo();
      
      // If info contains logs, save them to IndexedDB individually
      if (info.logs && info.logs.length > 0) {
        // Save each log to IndexedDB 
        // We're not adding them to updatedLogs to avoid duplication
        // since saveDebugLog handles deduplication internally now
        info.logs.forEach(log => {
          this.saveDebugLog(log).catch(err => 
            console.error('Failed to save individual log to IDB', err)
          );
        });
        
        // Log info about storage
        console.log(`Saving ${info.logs.length} logs directly to IndexedDB`);
        
        // Remove logs from the info object to avoid duplicate storage
        // The logs are already saved to IndexedDB, no need to store in localStorage too
        const { logs, ...infoWithoutLogs } = info;
        info = infoWithoutLogs;
      }
      
      // Create full debug info (without including logs to avoid duplication)
      const debugInfo: DebugInfo = { 
        ...existingDebugInfo,  // Start with existing debug info
        ...info,               // Override with new info
        // Keep existing logs if any
        logs: existingDebugInfo.logs || []
      };
      
      localStorage.setItem('slideDebugInfo', JSON.stringify(debugInfo));
    } catch (error) {
      // Don't use loggingService here to avoid circular dependency
      console.error('Failed to save debug info', error);
    }
  }
  
  /**
   * Get debug info
   * @returns Debug info object
   */
  getDebugInfo(): DebugInfo {
    try {
      if (this.isServiceWorker) {
        // In service worker, return empty debug info
        return { logs: [] };
      }
      
      const data = localStorage.getItem('slideDebugInfo');
      return data ? JSON.parse(data) as DebugInfo : { logs: [] };
    } catch (error) {
      // Don't use loggingService here to avoid circular dependency
      // Only log in console to avoid spam
      console.error('Failed to get debug info', error);
      return { logs: [] };
    }
  }
  
  /**
   * Get debug logs from IndexedDB
   * @param limit - Maximum number of logs to retrieve
   * @returns Promise resolving to array of log entries
   */
  async getDebugLogs(limit: number = 100): Promise<any[]> {
    try {
      if (this.isServiceWorker) {
        return [];
      }
      
      // Get logs from IndexedDB as the single source of truth
      try {
        const db = await this._openDatabase();
        
        // Check if logs store exists
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
          return [];
        }
        
        // Get logs from IndexedDB in descending order (newest first)
        const logs = await new Promise<any[]>((resolve, reject) => {
          const tx = db.transaction([LOGS_STORE], 'readonly');
          const store = tx.objectStore(LOGS_STORE);
          
          // Use timestamp index for sorting if available, otherwise use main cursor
          const request = store.index('timestamp').openCursor(null, 'prev');
          const result: any[] = [];
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            
            if (cursor && result.length < limit) {
              result.push(cursor.value);
              cursor.continue();
            } else {
              resolve(result);
            }
          };
          
          request.onerror = (event) => {
            console.error('Error getting logs', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
          
          tx.oncomplete = () => {
            db.close();
          };
        });
        
        // No localStorage cache - just return the logs directly
        return logs;
        
      } catch (error) {
        console.error('Failed to get logs from IndexedDB:', error);
        
        // Fallback to localStorage only if IndexedDB completely fails
        try {
          const CROSS_PAGE_LOG_KEY = 'notion_slides_debug_logs';
          const logsJson = localStorage.getItem(CROSS_PAGE_LOG_KEY);
          
          if (logsJson) {
            const localLogs = JSON.parse(logsJson);
            if (Array.isArray(localLogs)) {
              return localLogs.slice(0, limit);
            }
          }
        } catch (e) {
          console.error('Failed to get logs from localStorage fallback:', e);
        }
        
        return [];
      }
    } catch (error) {
      console.error('Failed to get debug logs', error);
      return [];
    }
  }
  
  /**
   * Save error info
   * @param error - Error info object
   */
  saveErrorInfo(error: ErrorInfo): void {
    try {
      if (this.isServiceWorker) {
        // Just log in service worker
        console.error('Error in service worker:', error);
        return;
      }
      
      localStorage.setItem('slideError', JSON.stringify({
        ...error,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      loggingService.error('Failed to save error info', err);
    }
  }
  
  /**
   * Clear all log data from IndexedDB
   * @returns Promise resolving when clearing completes
   */
  async clearLogs(): Promise<void> {
    try {
      if (this.isServiceWorker) return;
      
      // Clear logs from localStorage
      localStorage.removeItem('slideDebugInfo');
      localStorage.removeItem('notion_slides_debug_logs');
      
      // Clear logs from IndexedDB
      const db = await this._openDatabase();
      
      // Check if logs store exists
      if (db.objectStoreNames.contains(LOGS_STORE)) {
        const tx = db.transaction([LOGS_STORE], 'readwrite');
        const logsStore = tx.objectStore(LOGS_STORE);
        
        logsStore.clear();
        
        return new Promise((resolve) => {
          tx.oncomplete = () => {
            db.close();
            console.log('All logs cleared successfully');
            resolve();
          };
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to clear logs', error);
      return Promise.reject(error);
    }
  }

  /**
   * Clear all stored data
   * @returns Promise resolving when clearing completes
   */
  async clearAll(): Promise<void> {
    try {
      if (this.isServiceWorker) {
        return new Promise((resolve, reject) => {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      }
      
      // Clear localStorage
      localStorage.removeItem('slides');
      localStorage.removeItem('slideDebugInfo');
      localStorage.removeItem('slideError');
      localStorage.removeItem('notionSlidesSettings');
      localStorage.removeItem('notion_slides_debug_logs');
      
      // Clear IndexedDB
      const db = await this._openDatabase();
      
      // Get all store names
      const storeNames = Array.from(db.objectStoreNames);
      
      if (storeNames.length > 0) {
        const tx = db.transaction(storeNames, 'readwrite');
        
        // Clear all stores
        storeNames.forEach(storeName => {
          tx.objectStore(storeName).clear();
        });
        
        return new Promise((resolve) => {
          tx.oncomplete = () => {
            db.close();
            loggingService.debug('All cache data cleared successfully');
            resolve();
          };
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      loggingService.error('Failed to clear all data', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Open IndexedDB database
   * @returns Promise resolving to IDBDatabase
   * @private
   */
  private _openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(SLIDES_STORE)) {
          db.createObjectStore(SLIDES_STORE, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
        
        // Add logs store with the id as the key
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
          const logsStore = db.createObjectStore(LOGS_STORE, { 
            keyPath: 'id'
          });
          
          // Add indexes for easier querying
          logsStore.createIndex('timestamp', 'timestamp', { unique: false });
          logsStore.createIndex('level', 'level', { unique: false });
          logsStore.createIndex('context', 'metadata.context', { unique: false });
          
          // Add a compound index for timestamp+message to help detect duplicates
          logsStore.createIndex('timestamp_message', ['timestamp', 'message'], { unique: false });
          
          // Add a compound index for context+timestamp for faster retrieval of context-specific logs
          logsStore.createIndex('context_timestamp', ['metadata.context', 'timestamp'], { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
      
      request.onerror = (event) => {
        loggingService.error('IndexedDB open error', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
  
  /**
   * Save data to IndexedDB
   * @param storeName - Name of the object store
   * @param data - Data to save
   * @returns Promise resolving when save completes
   * @private
   */
  private async _saveToIndexedDB(storeName: string, data: unknown): Promise<void> {
    const db = await this._openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        loggingService.error(`IndexedDB save error (${storeName})`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  }
  
  /**
   * Get data from IndexedDB
   * @param storeName - Name of the object store
   * @param id - ID of the record to get
   * @returns Promise resolving to the data or null
   * @private
   */
  private async _getFromIndexedDB(storeName: string, id: string): Promise<unknown> {
    const db = await this._openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result || null);
      };
      
      request.onerror = (event) => {
        loggingService.error(`IndexedDB get error (${storeName})`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  }
}

// Export a singleton instance
export const storage = new Storage();