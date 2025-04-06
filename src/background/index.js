/**
 * Notion to Slides - Background Script
 * 
 * Handles communication between popup and content scripts.
 */

import { loggingService } from '../services/LoggingService.js';
import { addMessageListener } from '../common/messaging.js';
// ErrorService is imported but used indirectly through error handling
// ESLint disable next line
// eslint-disable-next-line no-unused-vars
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
    loggingService.debug('Background script received message', { message, sender });
    
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
  loggingService.debug('Background service worker initializing');
  setupMessageHandlers();
  loggingService.debug('Background service worker initialized');
}

// Start initialization
initialize();