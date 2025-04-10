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
  private saveSettingsBtn: HTMLElement | null;
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
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
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
    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', this.saveSettings.bind(this));
    }
    
    if (this.debugLoggingSelector) {
      this.debugLoggingSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.clearCacheBtn) {
      this.clearCacheBtn.addEventListener('click', this.clearAllCaches.bind(this));
    }
    
    // Bind theme selector for PRO restrictions
    if (this.themeSelector) {
      this.themeSelector.addEventListener('change', this.handleThemeChange.bind(this));
    }
  }
  
  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<void> {
    if (!this.themeSelector) return;
    
    try {
      // Get settings asynchronously
      const settings = await storage.getSettings();
      loggingService.debug('Settings loaded from IndexedDB', settings);
      
      // Set default values if settings don't exist
      const defaults = {
        theme: 'default',
        transition: 'slide',
        slideNumber: 'false',
        center: 'true',
        debugLogging: 'false'
      };
      
      // Apply settings to selectors
      if (this.themeSelector) this.themeSelector.value = settings.theme?.toString() || defaults.theme;
      if (this.transitionSelector) this.transitionSelector.value = settings.transition?.toString() || defaults.transition;
      if (this.slideNumberSelector) this.slideNumberSelector.value = settings.slideNumber?.toString() || defaults.slideNumber;
      if (this.centerSelector) this.centerSelector.value = settings.center?.toString() || defaults.center;
      
      // Set developer settings
      if (this.debugLoggingSelector) {
        const debugLogging = settings.debugLogging?.toString() || defaults.debugLogging;
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
        !this.slideNumberSelector || !this.centerSelector) {
      return;
    }
    
    loggingService.debug('Saving settings, debug logging value', this.debugLoggingSelector?.value);
    
    const settings: Settings = {
      theme: this.themeSelector.value,
      transition: this.transitionSelector.value,
      slideNumber: this.slideNumberSelector.value,
      center: this.centerSelector.value
    };
    
    // Add developer settings if present
    if (this.debugLoggingSelector) {
      // Get the value directly from the selector
      const debugEnabledStr = this.debugLoggingSelector.value;
      
      // Convert to proper boolean
      const debugEnabled = debugEnabledStr === 'true';
      
      // Store the actual boolean in settings - not a string
      settings.debugLogging = debugEnabled;
      
      console.log('Saving debug logging setting:', debugEnabled);
      console.log('Setting debugLogging with type:', typeof debugEnabled);
      
      // Setup debug indicator - it will handle everything internally:
      // - Checking if debug is enabled
      // - Configuring logging services
      // - Showing debug indicator if needed
      // - Logging app info
      await debugService.setupDebugIndicator(
        {
          position: 'bottom-right', 
          text: 'DEBUG MODE',
          zIndex: 9999
        },
        'about',  // Context identifier for logging
        { settingsPage: true }  // Additional data for logging
      );
    }
    
    await storage.saveSettings(settings);
    loggingService.debug('Settings saved', settings);
    
    // Show feedback
    if (this.saveStatus) {
      this.saveStatus.style.display = 'inline';
      
      // Hide feedback after 2 seconds
      setTimeout(() => {
        if (this.saveStatus) {
          this.saveStatus.style.display = 'none';
        }
      }, 2000);
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