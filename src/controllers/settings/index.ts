/**
 * Notion to Slides - Settings Script
 * 
 * Handles the settings page functionality.
 */

import { loggingService } from '../../services/logging_service';
import { storage } from '../../models/storage';
import { Settings } from '../../types/storage';

/**
 * SettingsController class to handle settings UI logic
 */
class SettingsController {
  private themeSelector: HTMLSelectElement;
  private transitionSelector: HTMLSelectElement;
  private slideNumberSelector: HTMLSelectElement;
  private centerSelector: HTMLSelectElement;
  private saveButton: HTMLButtonElement;
  private aboutLink: HTMLAnchorElement;
  
  /**
   * Constructor for the settings controller
   */
  constructor() {
    this.themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
    this.transitionSelector = document.getElementById('transitionSelector') as HTMLSelectElement;
    this.slideNumberSelector = document.getElementById('slideNumberSelector') as HTMLSelectElement;
    this.centerSelector = document.getElementById('centerSelector') as HTMLSelectElement;
    this.saveButton = document.getElementById('saveButton') as HTMLButtonElement;
    this.aboutLink = document.getElementById('aboutLink') as HTMLAnchorElement;
    
    this.bindEventHandlers();
    this.loadSettings();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Save button
    this.saveButton.addEventListener('click', this.saveSettings.bind(this));
    
    // About link
    this.aboutLink.addEventListener('click', this.handleAboutClick.bind(this));
  }
  
  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    try {
      const settings = storage.getSettings();
      
      // Set default values if settings don't exist
      const defaults = {
        theme: 'default',
        transition: 'slide',
        slideNumber: 'false',
        center: 'true'
      };
      
      // Apply settings to selectors
      this.themeSelector.value = settings.theme?.toString() || defaults.theme;
      this.transitionSelector.value = settings.transition?.toString() || defaults.transition;
      this.slideNumberSelector.value = settings.slideNumber?.toString() || defaults.slideNumber;
      this.centerSelector.value = settings.center?.toString() || defaults.center;
      
      loggingService.debug('Settings loaded', settings);
    } catch (error) {
      loggingService.error('Error loading settings', error);
    }
  }
  
  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      const settings: Settings = {
        theme: this.themeSelector.value,
        transition: this.transitionSelector.value,
        slideNumber: this.slideNumberSelector.value,
        center: this.centerSelector.value
      };
      
      await storage.saveSettings(settings);
      loggingService.debug('Settings saved', settings);
      
      // Show feedback
      this.saveButton.textContent = 'Saved!';
      this.saveButton.style.backgroundColor = '#27ae60';
      
      // Reset button after a short delay
      setTimeout(() => {
        this.saveButton.textContent = 'Save Settings';
        this.saveButton.style.backgroundColor = '#3F51B5';
      }, 1500);
    } catch (error) {
      loggingService.error('Error saving settings', error);
      
      // Show error feedback
      this.saveButton.textContent = 'Error!';
      this.saveButton.style.backgroundColor = '#e74c3c';
      
      setTimeout(() => {
        this.saveButton.textContent = 'Save Settings';
        this.saveButton.style.backgroundColor = '#3F51B5';
      }, 1500);
    }
  }
  
  /**
   * Handle about link click
   * @param e - Click event
   */
  private handleAboutClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  }
}

/**
 * Initialize the settings page
 */
function initialize(): void {
  loggingService.debug('Settings page initializing');
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Create settings controller
      const settingsController = new SettingsController();
      loggingService.debug('Settings initialization complete');
    } catch (error) {
      loggingService.error('Error initializing settings', error);
    }
  });
}

// Start initialization
initialize();