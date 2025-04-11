/**
 * Notion to Slides - Settings Controller
 * 
 * Handles the settings section of the About page, including theme,
 * transition, and other presentation settings.
 */

import { loggingService } from '../../services/logging_service';
import { storage } from '../../models/storage';
import { debugService } from '../../services/debug_service';
import { Settings } from '../../types/storage';

/**
 * Settings Controller for the About page
 */
export class SettingsController {
  // Settings elements
  private themeSelector: HTMLSelectElement | null;
  private transitionSelector: HTMLSelectElement | null;
  private slideNumberSelector: HTMLSelectElement | null;
  private centerSelector: HTMLSelectElement | null;
  private debugLoggingSelector: HTMLSelectElement | null;
  private saveStatus: HTMLElement | null;
  private clearCacheBtn: HTMLElement | null;
  
  // Event handlers
  private onSettingChanged: (() => void) | null = null;

  /**
   * Initialize the settings controller
   */
  constructor() {
    this.themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
    this.transitionSelector = document.getElementById('transitionSelector') as HTMLSelectElement;
    this.slideNumberSelector = document.getElementById('slideNumberSelector') as HTMLSelectElement;
    this.centerSelector = document.getElementById('centerSelector') as HTMLSelectElement;
    this.saveStatus = document.getElementById('saveStatus');
    this.debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement;
    this.clearCacheBtn = document.getElementById('clearCacheBtn');
    
    this.bindEventHandlers();
    
    // Initialize settings asynchronously
    this.initializeAsync();
  }
  
  /**
   * Initialize settings asynchronously
   */
  private async initializeAsync(): Promise<void> {
    try {
      await this.loadSettings();
      loggingService.debug('Settings loaded successfully');
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  }
  
  /**
   * Set a callback for when settings change
   * @param callback - Function to call when settings change
   */
  setSettingChangedCallback(callback: () => void): void {
    this.onSettingChanged = callback;
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Bind all setting selectors to save automatically on change
    if (this.themeSelector) {
      this.themeSelector.addEventListener('change', () => {
        this.handleThemeChange();
        this.saveSettings();
      });
    }
    
    if (this.transitionSelector) {
      this.transitionSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.slideNumberSelector) {
      this.slideNumberSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.centerSelector) {
      this.centerSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.debugLoggingSelector) {
      this.debugLoggingSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.clearCacheBtn) {
      this.clearCacheBtn.addEventListener('click', this.clearAllCaches.bind(this));
    }
  }
  
  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<void> {
    if (!this.themeSelector) return;
    
    try {
      // Get settings asynchronously - storage.getSettings already ensures default values
      const settings = await storage.getSettings();
      loggingService.debug('Settings loaded from IndexedDB', settings);
      
      // Apply settings to selectors - no need for fallback defaults as storage.getSettings handles that
      if (this.themeSelector) this.themeSelector.value = settings.theme?.toString() || '';
      if (this.transitionSelector) this.transitionSelector.value = settings.transition?.toString() || '';
      if (this.slideNumberSelector) this.slideNumberSelector.value = settings.slideNumber?.toString() || '';
      if (this.centerSelector) this.centerSelector.value = settings.center?.toString() || '';
      
      // Set developer settings
      if (this.debugLoggingSelector) {
        const debugLogging = settings.debugLogging?.toString() || 'false';
        loggingService.debug('Debug logging setting', debugLogging);
        this.debugLoggingSelector.value = debugLogging;
        
        // Apply debug logging setting
        loggingService.setDebugLogging(debugLogging === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  /**
   * Save settings to storage
   */
  async saveSettings(): Promise<void> {
    if (!this.themeSelector || !this.transitionSelector || 
        !this.slideNumberSelector || !this.centerSelector || !this.debugLoggingSelector) {
      return;
    }
    
    loggingService.debug('Auto-saving settings');
    
    // Get existing settings object - this will preserve all existing fields
    const settings = await storage.getSettings();
    
    // Only update the settings fields that are controlled by UI elements
    // This approach preserves all other fields in the settings object
    settings.theme = this.themeSelector.value;
    settings.transition = this.transitionSelector.value;
    settings.slideNumber = this.slideNumberSelector.value;
    settings.center = this.centerSelector.value;
    
    if (this.debugLoggingSelector) {
      const debugEnabledStr = this.debugLoggingSelector.value;
      settings.debugLogging = (debugEnabledStr === 'true');
    }
    
    // Save all settings, which now includes the UI updates plus all pre-existing values
    await storage.saveSettings(settings);
    loggingService.debug('Settings saved', settings);
    
    // Show feedback
    if (this.saveStatus) {
      this.saveStatus.style.display = 'inline';
      this.saveStatus.textContent = 'Settings saved!';
      
      // Hide feedback after 1.5 seconds
      setTimeout(() => {
        if (this.saveStatus) {
          this.saveStatus.style.display = 'none';
        }
      }, 1500);
    }
    
    // Notify parent of settings change
    if (this.onSettingChanged) {
      this.onSettingChanged();
    }
  }
  
  /**
   * Clear all caches
   */
  private async clearAllCaches(): Promise<void> {
    if (confirm('Are you sure you want to clear all data? This will remove all saved slides and settings.')) {
      try {
        await storage.clearAll();
        alert('All cache data has been cleared successfully.');
        // Reload the page to reflect changes
        window.location.reload();
      } catch (error) {
        alert('Failed to clear cache: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }
  
  /**
   * Handle theme change
   */
  private handleThemeChange(): void {
    // This is just a stub - will be handled by SubscriptionController
    // We'll implement the full functionality in the main controller
  }
}
