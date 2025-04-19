/**
 * Notion to Slides - Developer Controller
 * 
 * Handles the developer tools section of the about page
 */

import { configManager } from '../../models/config_manager';
import { storage } from '../../models/storage';

/**
 * Controller for the developer tools section
 */
export class DeveloperController {
  /**
   * Initialize the developer controller
   */
  constructor() {
    // Initialize debug settings
    this.initializeDebugSettings();
    
    // Set up event listeners for debug settings controls
    const debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement;
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    
    if (debugLoggingSelector) {
      debugLoggingSelector.addEventListener('change', this.handleDebugLoggingChange.bind(this));
    }
    
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', this.handleClearCacheClick.bind(this));
    }
  }
  
  /**
   * Initialize debug settings asynchronously
   */
  private async initializeDebugSettings(): Promise<void> {
    try {
      const settings = await configManager.getConfig();
      // Handle both boolean and string representation
      const debugEnabled = settings.debugLogging === true || 
                          (typeof settings.debugLogging === 'string' && settings.debugLogging === 'true');
      
      // Update UI to reflect current setting
      const debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement;
      if (debugLoggingSelector) {
        debugLoggingSelector.value = debugEnabled ? 'true' : 'false';
      }
    } catch (error) {
      console.error('Error initializing debug settings:', error);
    }
  }
  
  /**
   * Handle debug logging setting change
   */
  private async handleDebugLoggingChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const value = select.value === 'true';
    
    try {
      await configManager.setValue('debugLogging', value);
      console.log(`Debug logging ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving debug setting:', error);
    }
  }
  
  /**
   * Handle clear cache button click
   */
  private async handleClearCacheClick(): Promise<void> {
    if (confirm('Are you sure you want to clear all cached data? This will reset your settings.')) {
      try {
        // Clear all data from storage
        await storage.clearAll();
        // Reset config to defaults
        await configManager.resetToDefaults();
        console.log('Cache cleared successfully');
        
        // Show a success message to the user
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
          const originalText = clearCacheBtn.textContent;
          clearCacheBtn.textContent = 'Cleared!';
          
          setTimeout(() => {
            if (clearCacheBtn) {
              clearCacheBtn.textContent = originalText;
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Error clearing cache. Please try again.');
      }
    }
  }
}