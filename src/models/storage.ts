/**
 * Six Slides - Storage Module
 * 
 * Handles data persistence using IndexedDB
 */

import { loggingService } from '../services/logging_service';
import { Slide } from '../types/index';
import { Settings } from '../types/storage';

// IndexedDB database name and version
const DB_NAME = 'notionSlides';
const DB_VERSION = 3; 
const SLIDES_STORE = 'slides';
const SETTINGS_STORE = 'settings';

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
    const { DEFAULT_CONFIG } = await import('./config_manager');
    try {
      const settings = await this._getFromIndexedDB(SETTINGS_STORE, 'current') as Settings;
      if (settings) {
        return settings;
      }
      
      this._saveToIndexedDB(SETTINGS_STORE, { id: 'current', ...DEFAULT_CONFIG })
        .then(() => loggingService.debug('Default settings saved to IndexedDB'))
        .catch(err => loggingService.error('Failed to save default settings to IndexedDB', err));
      
      return { ...DEFAULT_CONFIG };
    } catch (error) {
      loggingService.error('Failed to get settings', error);
      return { ...DEFAULT_CONFIG };
    }
  }
  

  
  
  /**
   * Clear only slides data from IndexedDB
   * @returns Promise resolving when clearing completes
   */
  async clearSlides(): Promise<void> {
    try {
      loggingService.debug('Clearing slides from IndexedDB...');
      
      // Clear only slides from IndexedDB
      const db = await this._openDatabase();
      
      // Check if slides store exists
      if (db.objectStoreNames.contains(SLIDES_STORE)) {
        const tx = db.transaction([SLIDES_STORE], 'readwrite');
        const slidesStore = tx.objectStore(SLIDES_STORE);
        
        slidesStore.clear();
        
        return new Promise((resolve) => {
          tx.oncomplete = () => {
            db.close();
            loggingService.debug('All slides cleared successfully from IndexedDB');
            resolve();
          };
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      loggingService.error('Failed to clear slides', error);
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
