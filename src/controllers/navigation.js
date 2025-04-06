/**
 * Notion to Slides - Navigation Script
 * 
 * Handles the sidebar navigation functionality.
 */

import { loggingService } from '../services/LoggingService.js';
import { storage } from '../models/storage.js';

/**
 * Initialize navigation functionality
 */
function initNavigation() {
  // Navigation handling
  const navItems = document.querySelectorAll('.nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  
  // Save Settings button
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveStatus = document.getElementById('saveStatus');
  
  // Settings inputs
  const themeSelector = document.getElementById('themeSelector');
  const transitionSelector = document.getElementById('transitionSelector');
  const slideNumberSelector = document.getElementById('slideNumberSelector');
  const centerSelector = document.getElementById('centerSelector');
  
  // Developer settings
  const debugLoggingSelector = document.getElementById('debugLoggingSelector');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  
  // Load existing settings
  function loadSettings() {
    if (!themeSelector) return;
    
    const settings = storage.getSettings();
    
    // Set default values if settings don't exist
    const defaults = {
      theme: 'default',
      transition: 'slide',
      slideNumber: 'false',
      center: 'true',
      debugLogging: 'false'
    };
    
    // Apply settings to selectors
    themeSelector.value = settings.theme || defaults.theme;
    transitionSelector.value = settings.transition || defaults.transition;
    slideNumberSelector.value = settings.slideNumber || defaults.slideNumber;
    centerSelector.value = settings.center || defaults.center;
    
    // Set developer settings
    if (debugLoggingSelector) {
      const debugLogging = settings.debugLogging || defaults.debugLogging;
      debugLoggingSelector.value = debugLogging;
      
      // Apply debug logging setting
      loggingService.setDebugLogging(debugLogging === 'true');
    }
    
    loggingService.debug('Navigation: Settings loaded', settings);
  }
  
  // Save settings
  async function saveSettings() {
    const settings = {
      theme: themeSelector.value,
      transition: transitionSelector.value,
      slideNumber: slideNumberSelector.value,
      center: centerSelector.value
    };
    
    // Add developer settings if present
    if (debugLoggingSelector) {
      settings.debugLogging = debugLoggingSelector.value;
      
      // Apply debug logging setting immediately
      loggingService.setDebugLogging(debugLoggingSelector.value === 'true');
    }
    
    await storage.saveSettings(settings);
    loggingService.debug('Navigation: Settings saved', settings);
    
    // Show feedback
    if (saveStatus) {
      saveStatus.style.display = 'inline';
      
      // Hide feedback after 2 seconds
      setTimeout(() => {
        saveStatus.style.display = 'none';
      }, 2000);
    }
  }
  
  // Clear all caches
  async function clearAllCaches() {
    if (confirm('Are you sure you want to clear all data? This will remove all saved slides and settings.')) {
      try {
        await storage.clearAll();
        alert('All cache data has been cleared successfully.');
        // Reload the page to reflect changes
        window.location.reload();
      } catch (error) {
        alert('Failed to clear cache: ' + error.message);
      }
    }
  }
  
  // Attach events
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  if (debugLoggingSelector) {
    debugLoggingSelector.addEventListener('change', saveSettings);
  }
  
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearAllCaches);
  }
  
  // Handle help tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabButtons.length > 0) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update visible tab content
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === tabId) {
            content.classList.add('active');
          }
        });
      });
    });
  }
  
  // Load settings if we're on the settings page
  loadSettings();
  
  // Navigation functionality
  function setActivePage(pageId) {
    // Update nav items
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${pageId}`) {
        item.classList.add('active');
      }
    });
    
    // Update visible section
    pageSections.forEach(section => {
      section.classList.remove('active');
      if (section.id === pageId) {
        section.classList.add('active');
      }
    });
    
    // Update URL hash
    history.pushState(null, null, `#${pageId}`);
    
    // Save last active page
    localStorage.setItem('notionSlidesActivePage', pageId);
  }
  
  // Handle navigation clicks
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const pageId = item.getAttribute('href').substring(1);
      setActivePage(pageId);
    });
  });
  
  // Handle initial page load (from hash or localStorage)
  const hash = window.location.hash.substring(1);
  const savedPage = localStorage.getItem('notionSlidesActivePage');
  const defaultPage = 'about'; // Default page
  
  if (hash && document.getElementById(hash)) {
    setActivePage(hash);
  } else if (savedPage && document.getElementById(savedPage)) {
    setActivePage(savedPage);
  } else {
    setActivePage(defaultPage);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initNavigation);