/**
 * Notion to Slides - Settings Script
 * 
 * Handles the settings page functionality.
 */

import { logDebug, logError } from '../../common/utils.js';
import { storage } from '../../common/storage.js';

/**
 * SettingsController class to handle settings UI logic
 */
class SettingsController {
  /**
   * Constructor for the settings controller
   */
  constructor() {
    this.themeSelector = document.getElementById('themeSelector');
    this.transitionSelector = document.getElementById('transitionSelector');
    this.slideNumberSelector = document.getElementById('slideNumberSelector');
    this.centerSelector = document.getElementById('centerSelector');
    this.saveButton = document.getElementById('saveButton');
    this.aboutLink = document.getElementById('aboutLink');
    
    this.bindEventHandlers();
    this.loadSettings();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  bindEventHandlers() {
    // Save button
    this.saveButton.addEventListener('click', this.saveSettings.bind(this));
    
    // About link
    this.aboutLink.addEventListener('click', this.handleAboutClick.bind(this));
  }
  
  /**
   * Load settings from storage
   */
  loadSettings() {
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
      this.themeSelector.value = settings.theme || defaults.theme;
      this.transitionSelector.value = settings.transition || defaults.transition;
      this.slideNumberSelector.value = settings.slideNumber || defaults.slideNumber;
      this.centerSelector.value = settings.center || defaults.center;
      
      logDebug('Settings loaded', settings);
    } catch (error) {
      logError('Error loading settings', error);
    }
  }
  
  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      const settings = {
        theme: this.themeSelector.value,
        transition: this.transitionSelector.value,
        slideNumber: this.slideNumberSelector.value,
        center: this.centerSelector.value
      };
      
      await storage.saveSettings(settings);
      logDebug('Settings saved', settings);
      
      // Show feedback
      this.saveButton.textContent = 'Saved!';
      this.saveButton.style.backgroundColor = '#27ae60';
      
      // Reset button after a short delay
      setTimeout(() => {
        this.saveButton.textContent = 'Save Settings';
        this.saveButton.style.backgroundColor = '#3F51B5';
      }, 1500);
    } catch (error) {
      logError('Error saving settings', error);
      
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
   * @param {Event} e - Click event
   */
  handleAboutClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  }
}

/**
 * Initialize the settings page
 */
function initialize() {
  logDebug('Settings page initializing');
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Create settings controller
      const settingsController = new SettingsController();
      logDebug('Settings initialization complete');
    } catch (error) {
      logError('Error initializing settings', error);
    }
  });
}

// Start initialization
initialize();