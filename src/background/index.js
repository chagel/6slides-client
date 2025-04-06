/**
 * Notion to Slides - Background Script
 * 
 * Handles communication between popup and content scripts.
 */

import { logDebug } from '../common/utils.js';
import { addMessageListener } from '../common/messaging.js';
import { errorService, ErrorTypes } from '../services/ErrorService.js';

// Import app initialization
import '../app.js';

/**
 * Open the viewer in a new tab
 * @returns {Promise<void>}
 */
function openViewer() {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') }, () => {
      resolve({ success: true });
    });
  });
}

/**
 * Set up message handlers
 */
function setupMessageHandlers() {
  addMessageListener((message, sender) => {
    logDebug('Background script received message', { message, sender });
    
    // Handle any messages that should be processed by the background script
    if (message.action === 'open_viewer') {
      return openViewer();
    }
    
    // Default response for unhandled messages
    return { error: 'Unhandled message action: ' + message.action };
  });
}

/**
 * Initialize the background script
 */
function initialize() {
  logDebug('Background service worker initializing');
  setupMessageHandlers();
  logDebug('Background service worker initialized');
}

// Start initialization
initialize();