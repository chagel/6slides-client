/**
 * Notion to Slides - Storage Module
 * 
 * Handles data persistence using IndexedDB
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

/**
 * IndexedDB Slide data interface
 */
interface SlideData {
  id: string;
  slides: Slide[];
}

/**
 * Storage class that provides an API for IndexedDB storage
 */
class Storage {
  constructor() {
    // No initialization needed
  }
  
  /**
   * Save slides data to IndexedDB
   * @param slides - Array of slide objects
   * @returns Promise resolving when save completes
   */
  async saveSlides(slides: Slide[]): Promise<void> {
    try {
      loggingService.debug(`Saving ${slides.length} slides to IndexedDB`);
      return this._saveToIndexedDB(SLIDES_STORE, { id: 'current', slides });
    } catch (error) {
      loggingService.error('Failed to save slides', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get slides data from IndexedDB
   * @returns Promise resolving to array of slide objects
   */
  async getSlides(): Promise<Slide[]> {
    try {
      // Get from IndexedDB
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
   * Save settings to IndexedDB
   * @param settings - Settings object
   * @returns Promise resolving when save completes
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      // Create a clean object for storage with correct ID
      const settingsToSave = { id: 'current', ...settings };
      
      // Save to IndexedDB
      await this._saveToIndexedDB(SETTINGS_STORE, settingsToSave);
      
      loggingService.debug('Settings saved', settings);
      
      return Promise.resolve();
    } catch (error) {
      loggingService.error('Failed to save settings', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get settings asynchronously
   * @returns Promise resolving to Settings object
   */
  async getSettings(): Promise<Settings> {
    // Default settings if nothing is found
    const defaultSettings = {
      theme: "default",
      transition: "slide",
      slideNumber: false,
      center: true,
      debugLogging: false,
      extractionTimeout: 30
    };
    
    try {
      // Try to get from IndexedDB
      const settings = await this._getFromIndexedDB(SETTINGS_STORE, 'current') as Settings;
      if (settings) {
        return settings;
      }
      
      // No settings found, save default settings to IndexedDB for next time
      loggingService.debug('No settings found in IndexedDB, using defaults');
      
      // Save default settings to IndexedDB in the background
      // This ensures future calls will return the persisted settings
      this._saveToIndexedDB(SETTINGS_STORE, { id: 'current', ...defaultSettings })
        .then(() => loggingService.debug('Default settings saved to IndexedDB'))
        .catch(err => loggingService.error('Failed to save default settings to IndexedDB', err));
      
      return defaultSettings;
    } catch (error) {
      loggingService.error('Failed to get settings', error);
      return defaultSettings;
    }
  }
  
  /**
   * Save a single debug log entry to IndexedDB
   * @param logEntry - The log entry to save
   * @returns Promise that resolves when save is complete
   */
  async saveDebugLog(logEntry: any): Promise<void> {
    try {
      // Skip storage if IndexedDB is not available (e.g., in test environment)
      if (!this._isIndexedDBAvailable()) {
        // Just log to console in test environments
        if (process.env.NODE_ENV === 'test') {
          return;
        }
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
        } catch (_) {
          logEntry.metadata.context = 'unknown';
        }
      }
      
      // Generate a MongoDB-like ObjectID for the log entry
      // Format: timestamp (seconds) + machine/context hash + random counter
      
      // 1. Timestamp component (seconds since epoch)
      const timestampSecs = Math.floor(Date.now() / 1000);
      const timestampHex = timestampSecs.toString(16).padStart(8, '0');
      
      // 2. Context identifier (hash of context, similar to machine ID in MongoDB)
      const contextStr = logEntry.metadata.context || 'unknown';
      let contextHash = 0;
      for (let i = 0; i < contextStr.length; i++) {
        contextHash = ((contextHash << 5) - contextHash) + contextStr.charCodeAt(i);
        contextHash |= 0; // Convert to 32bit integer
      }
      // Take absolute value and get 6 hex digits (3 bytes)
      const contextHex = Math.abs(contextHash).toString(16).padStart(6, '0').slice(-6);
      
      // 3. Random counter (3 bytes)
      const randomCounter = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
      
      // Combine all parts to form a 24-character hex string (12 bytes)
      logEntry.id = `${timestampHex}${contextHex}${randomCounter}`;
      
      // Also add an ISO timestamp for when the log was saved (may be different from the log event time)
      logEntry.savedAt = new Date().toISOString();
      
      // Save to IndexedDB - this will automatically replace identical logs
      // rather than creating duplicates, because we're using a content-based ID
      await this._saveToIndexedDB(LOGS_STORE, logEntry);
    } catch (error) {
      console.error('Failed to save debug log to IndexedDB', error);
    }
  }

  /**
   * Save debug info
   * @param info - Debug info object
   */
  async saveDebugInfo(info: Partial<DebugInfo>): Promise<void> {
    try {
      // If info contains logs, save them to IndexedDB individually
      if (info.logs && info.logs.length > 0) {
        // Save each log to IndexedDB 
        for (const log of info.logs) {
          await this.saveDebugLog(log).catch(err => 
            console.error('Failed to save individual log to IDB', err)
          );
        }
        
        // Remove logs from the info object after saving them
        const { logs: _, ...infoWithoutLogs } = info;
        info = infoWithoutLogs;
      }
      
      // Save debug info to IndexedDB
      await this._saveToIndexedDB('debugInfo', { 
        id: 'current',
        ...info,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save debug info', error);
    }
  }
  
  /**
   * Get debug info
   * @returns Debug info object
   */
  async getDebugInfo(): Promise<DebugInfo> {
    try {
      const debugInfo = await this._getFromIndexedDB('debugInfo', 'current') as DebugInfo;
      return debugInfo || { logs: [] };
    } catch (error) {
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
      const db = await this._openDatabase();
      
      // Check if logs store exists
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        console.warn('Logs store does not exist in IndexedDB');
        return [];
      }
      
      // Get the total count of records in the store
      const totalCount = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction([LOGS_STORE], 'readonly');
        const store = tx.objectStore(LOGS_STORE);
        
        const countRequest = store.count();
        
        countRequest.onsuccess = (event) => {
          const count = (event.target as IDBRequest).result || 0;
          // Only log count when it seems unusual
          if (count === 0 || count > 1000) {
            loggingService.debug(`Total records in IndexedDB: ${count}`);
          }
          resolve(count);
        };
        
        countRequest.onerror = (event) => {
          console.error('Error counting logs', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      });
      
      // Fetch the actual logs
      const allLogs = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction([LOGS_STORE], 'readonly');
        const store = tx.objectStore(LOGS_STORE);
        
        const request = store.getAll();
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result || [];
          // Only log detailed info if count seems unusual
          if (result.length === 0 || result.length !== totalCount) {
            loggingService.debug(`Retrieved ${result.length} logs from IndexedDB out of total ${totalCount}`);
          }
          
          resolve(result);
        };
        
        request.onerror = (event) => {
          console.error('Error getting logs', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
        
        tx.oncomplete = () => {
          db.close();
        };
      });
      
      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => {
        const aTime = a.timestamp || '';
        const bTime = b.timestamp || '';
        return bTime.localeCompare(aTime);
      });
      
      return allLogs.slice(0, limit);
    } catch (error) {
      console.error('Failed to get debug logs', error);
      return [];
    }
  }
  
  /**
   * Save error info
   * @param error - Error info object
   */
  async saveErrorInfo(error: ErrorInfo): Promise<void> {
    try {
      // Save error to IndexedDB
      await this._saveToIndexedDB('errors', {
        id: `error_${Date.now()}`,
        ...error,
        timestamp: new Date().toISOString()
      });
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
      loggingService.debug('Clearing all logs from IndexedDB...');
      
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
            console.log('All logs cleared successfully from IndexedDB');
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
   * Check if IndexedDB is available in the current environment
   * @returns True if IndexedDB is available
   * @private
   */
  private _isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Open IndexedDB database
   * @returns Promise resolving to IDBDatabase
   * @private
   */
  private _openDatabase(): Promise<IDBDatabase> {
    // Check if IndexedDB is available
    if (!this._isIndexedDBAvailable()) {
      return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

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
