/**
 * Notion to Slides - Content Script
 * 
 * Main content script for extracting content from Notion pages
 */

import { logDebug, logError } from '../common/utils.js';
import { ContentExtractor } from '../models/contentExtractor.js';

/**
 * Extract content from the current page
 * @returns {Promise<string[]>} - Array of markdown strings, one per slide
 */
function extractContent() {
  try {
    // Create content extractor
    const extractor = new ContentExtractor(document);
    
    // Extract slides
    return Promise.resolve(extractor.extract());
  } catch (error) {
    logError('Error in content extraction', error);
    return Promise.reject(error);
  }
}

/**
 * Log a message to the console with a prefix
 * @param {string} type - Log type (log, error, etc.)
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
function logMessage(type, message, data) {
  console[type](`[Notion Slides] ${message}`, data || '');
}

// Set up message handlers
function setupMessageHandlers() {
  // Add listener for messages from popup/background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logDebug('Content script received message', message);
    
    // Ping action to check if content script is loaded
    if (message.action === 'ping') {
      sendResponse({ status: 'content_script_ready' });
      return true;
    }
    
    // Extract content action
    if (message.action === 'extract_content') {
      logDebug('Extracting content from Notion page');
      
      // Use setTimeout to ensure the DOM is fully loaded and accessible
      setTimeout(async () => {
        try {
          const slides = await extractContent();
          
          if (!slides || slides.length === 0) {
            sendResponse({ 
              error: 'No slides found. Make sure your page has H1 headings to define slides.' 
            });
          } else {
            logDebug(`Successfully extracted ${slides.length} slides`);
            sendResponse({ slides });
          }
        } catch (error) {
          logError('Error during extraction', error);
          
          // Create a detailed error response
          sendResponse({ 
            error: 'Error extracting slides: ' + (error.message || 'Unknown error'),
            stack: error.stack
          });
        }
      }, 300); // Short delay to ensure DOM is accessible
      
      // Return true to keep the message channel open for async response
      return true;
    }
    
    // Return false for unhandled messages
    return false;
  });
  
  logDebug('Message handlers set up');
}

// Initialize the content script
function initialize() {
  logMessage('log', 'Content script initializing');
  setupMessageHandlers();
  logMessage('log', 'Content script initialized');
}

// Start initialization
initialize();

// Export key functionality for testing
export { extractContent };