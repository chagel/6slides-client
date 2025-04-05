/**
 * Notion to Slides - Popup Script
 * 
 * Handles the popup UI and initiates the content extraction process.
 */

import { logDebug, logError } from '../../common/utils.js';
import { sendToContent, sendToBackground } from '../../common/messaging.js';
import { storage } from '../../common/storage.js';

/**
 * PopupController class to handle popup UI logic
 */
class PopupController {
  /**
   * Constructor for the popup controller
   */
  constructor() {
    this.convertBtn = document.getElementById('convertBtn');
    this.statusEl = document.getElementById('status');
    this.instructionsLink = document.getElementById('instructionsLink');
    this.aboutLink = document.getElementById('aboutLink');
    this.settingsLink = document.getElementById('settingsLink');
    
    this.bindEventHandlers();
    this.checkCurrentPage();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  bindEventHandlers() {
    // Convert button
    this.convertBtn.addEventListener('click', this.handleConvertClick.bind(this));
    
    // Links
    this.instructionsLink.addEventListener('click', this.handleInstructionsClick.bind(this));
    this.aboutLink.addEventListener('click', this.handleAboutClick.bind(this));
    this.settingsLink.addEventListener('click', this.handleSettingsClick.bind(this));
  }
  
  /**
   * Update status message in the popup
   * @param {string} message - Message to display
   * @param {string|null} statusType - Optional status type: 'ready', 'not-ready', or null for no indicator
   */
  updateStatus(message, statusType = null) {
    // Clear previous content
    this.statusEl.innerHTML = '';
    
    // Create status indicator dot if statusType is provided
    if (statusType) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator ${statusType}`;
      this.statusEl.appendChild(indicator);
    }
    
    // Add message text
    const messageText = document.createTextNode(message);
    this.statusEl.appendChild(messageText);
    
    logDebug('Status updated', { message, statusType });
  }
  
  /**
   * Check if we're on a Notion page or other supported page
   * @returns {Promise<Object>} Object with compatible flag and page type
   */
  async checkIsCompatiblePage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Notion domains
      if (tab.url.includes('notion.so') || tab.url.includes('notion.site')) {
        return { compatible: true, type: 'notion', tab };
      }
      
      // Could add other compatible site checks here
      
      return { compatible: false, tab };
    } catch (error) {
      logError('Error checking if page is compatible', error);
      return { compatible: false, error };
    }
  }
  
  /**
   * Try to inject content script if not already there
   * @param {Object} tab - The active tab object
   * @returns {Promise<boolean>} Whether content script is loaded
   */
  async ensureContentScriptLoaded(tab) {
    try {
      // First try to send a ping message to see if content script is loaded
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
          if (chrome.runtime.lastError || !response) {
            logDebug('Content script not yet loaded, injecting...');
            
            // Script not loaded, try to inject it
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['src/content/index.js']
            }).then(() => {
              logDebug('Content script injected successfully');
              resolve(true);
            }).catch(err => {
              logError('Failed to inject content script', err);
              resolve(false);
            });
          } else {
            logDebug('Content script already loaded');
            resolve(true);
          }
        });
        
        // Set a timeout just in case
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      logError('Error ensuring content script loaded', error);
      return false;
    }
  }
  
  /**
   * Handle convert button click
   */
  async handleConvertClick() {
    // Disable button during processing
    this.convertBtn.disabled = true;
    
    try {
      const pageInfo = await this.checkIsCompatiblePage();
      
      if (!pageInfo.compatible) {
        this.updateStatus('Error: Please navigate to a Notion page.', 'not-ready');
        this.convertBtn.disabled = false;
        return;
      }
      
      this.updateStatus('Checking template format...');
      
      // Make sure content script is loaded
      const contentScriptLoaded = await this.ensureContentScriptLoaded(pageInfo.tab);
      if (!contentScriptLoaded) {
        this.updateStatus('Error: Could not initialize content extraction.', 'not-ready');
        this.convertBtn.disabled = false;
        return;
      }
      
      this.updateStatus('Extracting content from page...');
      
      // Send message to content script
      const response = await sendToContent(pageInfo.tab.id, { 
        action: 'extract_content',
        pageType: pageInfo.type
      });
      
      if (response && response.slides && response.slides.length > 0) {
        this.updateStatus(`Found ${response.slides.length} slides! Creating presentation...`, 'ready');
        
        // Store debug info
        const debugInfo = {
          timestamp: new Date().toISOString(),
          pageType: pageInfo.type,
          url: pageInfo.tab.url,
          slideCount: response.slides.length
        };
        
        // Store slides and debug info
        await storage.saveSlides(response.slides);
        storage.saveDebugInfo(debugInfo);
        
        // Open viewer in the current tab
        chrome.tabs.update(pageInfo.tab.id, { url: chrome.runtime.getURL('viewer.html') });
        
        // Close the popup
        window.close();
      } else if (response && response.error) {
        logError('Extraction error details', response);
        this.updateStatus(`Error: ${response.error}`, 'not-ready');
        
        // Store error info for debugging
        storage.saveErrorInfo({
          error: response.error,
          stack: response.stack
        });
      } else {
        this.updateStatus('Error: No slides found. Make sure your page follows the template format and has at least one H1 heading.', 'not-ready');
      }
    } catch (error) {
      logError('Error converting page', error);
      this.updateStatus(`Error: ${error.message}`, 'not-ready');
    } finally {
      this.convertBtn.disabled = false;
    }
  }
  
  /**
   * Handle instructions link click
   * @param {Event} e - Click event
   */
  handleInstructionsClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#help') });
  }
  
  /**
   * Handle about link click
   * @param {Event} e - Click event
   */
  handleAboutClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#about') });
  }
  
  /**
   * Handle settings link click
   * @param {Event} e - Click event
   */
  handleSettingsClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#settings') });
  }
  
  /**
   * Check if current tab is viewer.html
   * @returns {Promise<boolean>}
   */
  async isCurrentTabViewer() {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([currentTab]) => {
        const currentTabUrl = currentTab?.url || '';
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        
        resolve(currentTabUrl.includes(viewerUrl));
      });
    });
  }
  
  /**
   * Check the current page and update UI accordingly
   */
  async checkCurrentPage() {
    try {
      const [pageInfo, isViewer] = await Promise.all([
        this.checkIsCompatiblePage(),
        this.isCurrentTabViewer()
      ]);
      
      if (isViewer) {
        // We are currently on the viewer.html page
        this.updateStatus('Currently in presentation mode', 'ready');
        this.convertBtn.disabled = true;
        this.convertBtn.textContent = 'Presenting...';
      } else if (!pageInfo.compatible) {
        this.updateStatus('Not on a Notion page.', 'not-ready');
        this.convertBtn.disabled = true;
      } else {
        this.updateStatus('Ready! Ensure Notion page with required format.', 'ready');
      }
    } catch (error) {
      logError('Error checking current page', error);
      this.updateStatus('Error checking page status.', 'not-ready');
    }
  }
}

/**
 * Initialize the popup
 */
function initialize() {
  logDebug('Popup initializing');
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Create popup controller
      const popupController = new PopupController();
      logDebug('Popup initialization complete');
    } catch (error) {
      logError('Error initializing popup', error);
    }
  });
}

// Start initialization
initialize();