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
const DB_VERSION = 1;
const SLIDES_STORE = 'slides';
const SETTINGS_STORE = 'settings';

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
      
      // Merge the existing logs with the new debug info
      const debugInfo: DebugInfo = { 
        ...info,
        logs: existingDebugInfo.logs || [] 
      };
      
      localStorage.setItem('slideDebugInfo', JSON.stringify(debugInfo));
    } catch (error) {
      // Don't use loggingService here to avoid circular dependency
      // Only log in console to avoid spam
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
      
      // Clear IndexedDB
      const db = await this._openDatabase();
      const tx = db.transaction([SLIDES_STORE, SETTINGS_STORE], 'readwrite');
      const slidesStore = tx.objectStore(SLIDES_STORE);
      const settingsStore = tx.objectStore(SETTINGS_STORE);
      
      slidesStore.clear();
      settingsStore.clear();
      
      return new Promise((resolve) => {
        tx.oncomplete = () => {
          db.close();
          loggingService.debug('All cache data cleared successfully');
          resolve();
        };
      });
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