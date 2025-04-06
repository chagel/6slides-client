/**
 * Notion to Slides - Storage Module
 * 
 * Handles data persistence using localStorage with fallback to IndexedDB for large data
 */

import { loggingService } from '../services/LoggingService.js';

// IndexedDB database name and version
const DB_NAME = 'notionSlides';
const DB_VERSION = 1;
const SLIDES_STORE = 'slides';
const SETTINGS_STORE = 'settings';

// Size threshold in bytes before using IndexedDB instead of localStorage (1MB)
const SIZE_THRESHOLD = 1 * 1024 * 1024; 

/**
 * Storage class that provides a unified API for localStorage and IndexedDB
 */
class Storage {
  /**
   * Save slides data (uses IndexedDB for large datasets)
   * @param {string[]} slides - Array of slide markdown content
   * @returns {Promise<void>}
   */
  async saveSlides(slides) {
    try {
      const data = JSON.stringify(slides);
      
      // Check data size
      const dataSize = new Blob([data]).size;
      
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
   * @returns {Promise<string[]>} - Array of slide markdown content
   */
  async getSlides() {
    try {
      // First try localStorage
      const localData = localStorage.getItem('slides');
      
      if (localData) {
        const slides = JSON.parse(localData);
        loggingService.debug(`Retrieved ${slides.length} slides from localStorage`);
        return slides;
      }
      
      // If not in localStorage, try IndexedDB
      const dbData = await this._getFromIndexedDB(SLIDES_STORE, 'current');
      
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
   * @param {Object} settings - Settings object
   * @returns {Promise<void>}
   */
  saveSettings(settings) {
    try {
      localStorage.setItem('notionSlidesSettings', JSON.stringify(settings));
      loggingService.debug('Settings saved to localStorage', settings);
      return Promise.resolve();
    } catch (error) {
      loggingService.error('Failed to save settings', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Get settings
   * @returns {Object} - Settings object
   */
  getSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('notionSlidesSettings') || '{}');
      return settings;
    } catch (error) {
      loggingService.error('Failed to get settings', error);
      return {};
    }
  }
  
  /**
   * Save debug info
   * @param {Object} info - Debug info object
   */
  saveDebugInfo(info) {
    try {
      localStorage.setItem('slideDebugInfo', JSON.stringify(info));
    } catch (error) {
      // Don't use loggingService here to avoid circular dependency
      // Only log in console to avoid spam
      console.error('Failed to save debug info', error);
    }
  }
  
  /**
   * Get debug info
   * @returns {Object} Debug info object
   */
  getDebugInfo() {
    try {
      const data = localStorage.getItem('slideDebugInfo');
      return data ? JSON.parse(data) : { logs: [] };
    } catch (error) {
      // Don't use loggingService here to avoid circular dependency
      // Only log in console to avoid spam
      console.error('Failed to get debug info', error);
      return { logs: [] };
    }
  }
  
  /**
   * Save error info
   * @param {Object} error - Error info object
   */
  saveErrorInfo(error) {
    try {
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
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
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
   * @returns {Promise<IDBDatabase>}
   * @private
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(SLIDES_STORE)) {
          db.createObjectStore(SLIDES_STORE, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        loggingService.error('IndexedDB open error', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Save data to IndexedDB
   * @param {string} storeName - Name of the object store
   * @param {Object} data - Data to save
   * @returns {Promise<void>}
   * @private
   */
  async _saveToIndexedDB(storeName, data) {
    const db = await this._openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        loggingService.error(`IndexedDB save error (${storeName})`, event.target.error);
        reject(event.target.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  }
  
  /**
   * Get data from IndexedDB
   * @param {string} storeName - Name of the object store
   * @param {string} id - ID of the record to get
   * @returns {Promise<Object|null>}
   * @private
   */
  async _getFromIndexedDB(storeName, id) {
    const db = await this._openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };
      
      request.onerror = (event) => {
        loggingService.error(`IndexedDB get error (${storeName})`, event.target.error);
        reject(event.target.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  }
}

// Export a singleton instance
export const storage = new Storage();