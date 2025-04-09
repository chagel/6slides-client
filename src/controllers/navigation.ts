/**
 * Notion to Slides - Navigation Script
 * 
 * Handles the sidebar navigation functionality.
 */

import { loggingService } from '../services/logging_service';
import { debugService } from '../services/debug_service';
import { storage } from '../models/storage';
import { Settings } from '../types/storage';

/**
 * Initialize navigation functionality
 */
function initNavigation(): void {
  // Navigation handling
  const navItems = document.querySelectorAll<HTMLAnchorElement>('.nav-item');
  const pageSections = document.querySelectorAll<HTMLElement>('.page-section');
  
  // Save Settings button
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveStatus = document.getElementById('saveStatus');
  
  // Settings inputs
  const themeSelector = document.getElementById('themeSelector') as HTMLSelectElement | null;
  const transitionSelector = document.getElementById('transitionSelector') as HTMLSelectElement | null;
  const slideNumberSelector = document.getElementById('slideNumberSelector') as HTMLSelectElement | null;
  const centerSelector = document.getElementById('centerSelector') as HTMLSelectElement | null;
  
  // Developer settings
  const debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement | null;
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  
  // Load existing settings
  function loadSettings(): void {
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
    if (themeSelector) themeSelector.value = settings.theme?.toString() || defaults.theme;
    if (transitionSelector) transitionSelector.value = settings.transition?.toString() || defaults.transition;
    if (slideNumberSelector) slideNumberSelector.value = settings.slideNumber?.toString() || defaults.slideNumber;
    if (centerSelector) centerSelector.value = settings.center?.toString() || defaults.center;
    
    // Set developer settings
    if (debugLoggingSelector) {
      const debugLogging = settings.debugLogging?.toString() || defaults.debugLogging;
      debugLoggingSelector.value = debugLogging;
      
      // Apply debug logging setting through debugService
      debugService.setDebugEnabled(debugLogging === 'true');
    }
    
    loggingService.debug('Navigation: Settings loaded', settings);
  }
  
  // Save settings
  async function saveSettings(): Promise<void> {
    if (!themeSelector || !transitionSelector || !slideNumberSelector || !centerSelector) {
      return;
    }
    
    const settings: Settings = {
      theme: themeSelector.value,
      transition: transitionSelector.value,
      slideNumber: slideNumberSelector.value,
      center: centerSelector.value
    };
    
    // Add developer settings if present
    if (debugLoggingSelector) {
      settings.debugLogging = debugLoggingSelector.value === 'true';
      
      // Apply debug logging setting through debugService
      const debugEnabled = debugLoggingSelector.value === 'true';
      debugService.setDebugEnabled(debugEnabled);
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
  async function clearAllCaches(): Promise<void> {
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
  
  // Go back to the simpler approach with data-tab attributes
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check if it's a tab button
    if (target.classList.contains('tab-button') || target.parentElement?.classList.contains('tab-button')) {
      e.preventDefault();
      
      // Get the actual button (could be child element)
      const button = target.classList.contains('tab-button') ? target : target.parentElement;
      if (!button) return;
      
      // Get the data-tab attribute
      const tabId = button.getAttribute('data-tab');
      if (!tabId) return;
      
      // Find the content section
      const tabContent = document.getElementById(tabId);
      if (!tabContent) return;
      
      // Update active button
      const tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update the content visibility
      const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });
      
      // Show the selected content
      tabContent.classList.add('active');
      tabContent.style.display = 'block';
    }
  });
  
  // Load settings if we're on the settings page
  loadSettings();
  
  // Navigation functionality
  function setActivePage(pageId: string): void {
    // Update nav items
    navItems.forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href && href === `#${pageId}`) {
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
    history.pushState(null, document.title, `#${pageId}`);
    
    // Save last active page
    localStorage.setItem('notionSlidesActivePage', pageId);
  }
  
  // Handle navigation clicks
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const href = item.getAttribute('href');
      if (href) {
        const pageId = href.substring(1);
        setActivePage(pageId);
      }
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