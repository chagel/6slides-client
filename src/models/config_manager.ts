/**
 * Notion to Slides - Configuration Manager
 * 
 * Centralized configuration management service
 */

import { loggingService } from '../services/logging_service';
import { storage } from './storage';

/**
 * Subscription level enum
 */
export enum SubscriptionLevel {
  FREE = 'free',
  PRO = 'pro',
  TEAM = 'team'
}

/**
 * Configuration interface
 */
export interface Config {
  // Presentation settings
  theme: string;
  transition: string;
  slideNumber: boolean;
  center: boolean;
  
  // Extension settings
  debugLogging: boolean;
  extractionTimeout: number; // seconds
  
  // Subscription settings
  subscriptionLevel: SubscriptionLevel;
  subscriptionExpiry: number | null; // timestamp
  
  // Allow additional properties
  [key: string]: any;
}

/**
 * Presentation settings interface
 */
export interface PresentationSettings {
  theme: string;
  transition: string;
  slideNumber: boolean | string;
  center: boolean | string;
}

// Default configuration values
const DEFAULT_CONFIG: Config = {
  // Presentation settings
  theme: 'default',
  transition: 'slide',
  slideNumber: false,
  center: true,
  
  // Extension settings
  debugLogging: false,
  extractionTimeout: 30, // seconds
  
  // Subscription settings
  subscriptionLevel: SubscriptionLevel.FREE,
  subscriptionExpiry: null
};

/**
 * Configuration Manager
 * Handles application-wide configuration
 */
class ConfigManager {
  /**
   * Load configuration from storage
   * @returns Configuration object
   */
  getConfig(): Config {
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
   * @param config - Configuration object to save
   * @returns Promise that resolves when configuration is saved
   */
  async saveConfig(config: Partial<Config>): Promise<void> {
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
   * @param key - Configuration key
   * @param defaultValue - Default value if not found
   * @returns Configuration value
   */
  getValue<T>(key: string, defaultValue: T | null = null): T {
    const config = this.getConfig();
    return key in config ? config[key] : defaultValue as T;
  }
  
  /**
   * Set a specific configuration value
   * @param key - Configuration key
   * @param value - Value to set
   * @returns Promise that resolves when value is saved
   */
  async setValue<T>(key: string, value: T): Promise<void> {
    const config = this.getConfig();
    config[key] = value;
    await this.saveConfig(config);
  }
  
  /**
   * Reset configuration to defaults
   * @returns Promise that resolves when configuration is reset
   */
  async resetToDefaults(): Promise<void> {
    await this.saveConfig({ ...DEFAULT_CONFIG });
    loggingService.debug('Configuration reset to defaults');
  }
  
  /**
   * Get presentation-specific settings
   * @returns Presentation settings
   */
  getPresentationSettings(): PresentationSettings {
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
   * @param enabled - Whether debug logging is enabled
   * @returns Promise that resolves when setting is saved
   */
  async setDebugLogging(enabled: boolean): Promise<void> {
    await this.setValue('debugLogging', !!enabled);
    
    // Update the logging service directly
    loggingService.setDebugLogging(!!enabled);
  }

  /**
   * Get current subscription level
   * @returns Current subscription level
   */
  getSubscriptionLevel(): SubscriptionLevel {
    return this.getValue('subscriptionLevel', SubscriptionLevel.FREE);
  }

  /**
   * Check if user has pro subscription or higher
   * @returns True if user has pro features
   */
  hasPro(): boolean {
    const level = this.getSubscriptionLevel();
    const expiry = this.getValue('subscriptionExpiry', null);
    
    // Check for valid subscription and not expired
    return (
      (level === SubscriptionLevel.PRO || level === SubscriptionLevel.TEAM) && 
      (expiry === null || expiry > Date.now())
    );
  }

  /**
   * Set subscription level and expiry
   * @param level - Subscription level
   * @param expiryDate - Expiry date timestamp or null for no expiry
   * @returns Promise that resolves when subscription is updated
   */
  async setSubscription(level: SubscriptionLevel, expiryDate: number | null = null): Promise<void> {
    await this.saveConfig({
      subscriptionLevel: level,
      subscriptionExpiry: expiryDate
    });
    
    loggingService.debug(`Subscription updated to ${level}`);
  }
  
  /**
   * Check if remaining slides are available for free users
   * @param currentSlideCount - Current number of slides in presentation
   * @returns True if more slides are allowed
   */
  hasRemainingSlides(currentSlideCount: number): boolean {
    const FREE_SLIDE_LIMIT = 10;
    
    // Pro users have unlimited slides
    if (this.hasPro()) {
      return true;
    }
    
    // Free users have limited slides
    return currentSlideCount <= FREE_SLIDE_LIMIT;
  }
}

// Export a singleton instance
export const configManager = new ConfigManager();