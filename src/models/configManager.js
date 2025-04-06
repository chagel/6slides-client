/**
 * Notion to Slides - Configuration Manager
 * 
 * Centralized configuration management service
 */

import { loggingService } from '../services/LoggingService.js';
import { storage } from './storage.js';

// Default configuration values
const DEFAULT_CONFIG = {
  // Presentation settings
  theme: 'default',
  transition: 'slide',
  slideNumber: false,
  center: true,
  
  // Extension settings
  debugLogging: false,
  extractionTimeout: 30 // seconds
};

/**
 * Configuration Manager
 * Handles application-wide configuration
 */
class ConfigManager {
  /**
   * Load configuration from storage
   * @returns {Object} - Configuration object
   */
  getConfig() {
    try {
      const savedConfig = storage.getSettings();
      
      // Merge saved config with defaults
      return {
        ...DEFAULT_CONFIG,
        ...savedConfig
      };
    } catch (error) {
      loggingService.error('Error loading configuration', error);
      return { ...DEFAULT_CONFIG };
    }
  }
  
  /**
   * Save configuration to storage
   * @param {Object} config - Configuration object to save
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    try {
      await storage.saveSettings(config);
      loggingService.debug('Configuration saved');
    } catch (error) {
      loggingService.error('Error saving configuration', error);
      throw error;
    }
  }
  
  /**
   * Get a specific configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Configuration value
   */
  getValue(key, defaultValue = null) {
    const config = this.getConfig();
    return key in config ? config[key] : defaultValue;
  }
  
  /**
   * Set a specific configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Value to set
   * @returns {Promise<void>}
   */
  async setValue(key, value) {
    const config = this.getConfig();
    config[key] = value;
    await this.saveConfig(config);
  }
  
  /**
   * Reset configuration to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    await this.saveConfig({ ...DEFAULT_CONFIG });
    loggingService.debug('Configuration reset to defaults');
  }
  
  /**
   * Get presentation-specific settings
   * @returns {Object} Presentation settings
   */
  getPresentationSettings() {
    const config = this.getConfig();
    return {
      theme: config.theme,
      transition: config.transition,
      slideNumber: config.slideNumber,
      center: config.center
    };
  }
  
  /**
   * Set debug logging state
   * @param {boolean} enabled - Whether debug logging is enabled
   * @returns {Promise<void>}
   */
  async setDebugLogging(enabled) {
    await this.setValue('debugLogging', !!enabled);
    
    // Update the logging service directly
    loggingService.setDebugLogging(!!enabled);
  }
}

// Export a singleton instance
export const configManager = new ConfigManager();