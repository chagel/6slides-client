/**
 * Notion to Slides - Content Script
 * 
 * Main content script for extracting content from various page types
 */

import { loggingService } from '../services/LoggingService.js';
import { contentController } from '../controllers/contentController.js';

// Import app initialization to ensure services are registered
import '../app.js';
import { getService } from '../services/DependencyContainer.js';

/**
 * Extract content from the current page
 * @returns {Promise<Object[]>} - Array of slide objects
 */
async function extractContent() {
  try {
    // Get current URL
    const url = window.location.href;
    
    // Clear storage to ensure we get fresh content each extraction
    // This makes the extension more predictable for users
    localStorage.removeItem('slides');

    // Get the content controller from the dependency container
    const controller = getService('contentController');
    
    // Use the content controller to extract content based on the page type
    const result = await controller.extractContent(document, url);
    
    if (result.error) {
      return Promise.reject(new Error(result.error));
    }
    
    // Add debug logging to see what was extracted before storage
    console.log('EXTRACTED SLIDES BEFORE STORAGE:');
    console.log(JSON.stringify(result.slides, null, 2));
    
    return Promise.resolve(result.slides);
  } catch (error) {
    loggingService.error('Error in content extraction', error);
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
    loggingService.debug('Content script received message', message);
    
    // Ping action to check if content script is loaded
    if (message.action === 'ping') {
      sendResponse({ status: 'content_script_ready' });
      return true;
    }
    
    // Extract content action
    if (message.action === 'extract_content') {
      loggingService.debug('Extracting content from Notion page');
      
      // Use setTimeout to ensure the DOM is fully loaded and accessible
      setTimeout(async () => {
        try {
          const slides = await extractContent();
          
          if (!slides || slides.length === 0) {
            sendResponse({ 
              error: 'No slides found. Make sure your page has H1 headings to define slides.' 
            });
          } else {
            loggingService.debug(`Successfully extracted ${slides.length} slides`);
            sendResponse({ slides });
          }
        } catch (error) {
          loggingService.error('Error during extraction', error);
          
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
  
  loggingService.debug('Message handlers set up');
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
