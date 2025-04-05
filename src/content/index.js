/**
 * Notion to Slides - Content Script Main Module
 * 
 * Main entry point for the content script
 */

import { logDebug, logError } from '../common/utils.js';
import { addMessageListener } from '../common/messaging.js';
import { ContentExtractor } from './contentExtractor.js';

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

// Set up message listeners
function setupMessageHandlers() {
  addMessageListener((message, sender) => {
    logDebug('Content script received message', message);
    
    // Ping action to check if content script is loaded
    if (message.action === 'ping') {
      return { status: 'content_script_ready' };
    }
    
    // Extract content action
    if (message.action === 'extract_content') {
      logDebug('Extracting content from Notion page');
      
      // Return a promise
      return new Promise((resolve) => {
        // Use setTimeout to ensure the DOM is fully loaded and accessible
        setTimeout(async () => {
          try {
            const slides = await extractContent();
            
            if (!slides || slides.length === 0) {
              resolve({ 
                error: 'No slides found. Make sure your page has H1 headings to define slides.' 
              });
            } else {
              logDebug(`Successfully extracted ${slides.length} slides`);
              resolve({ slides });
            }
          } catch (error) {
            logError('Error during extraction', error);
            
            // Create a detailed error response
            resolve({ 
              error: 'Error extracting slides: ' + (error.message || 'Unknown error'),
              stack: error.stack
            });
          }
        }, 300); // Short delay to ensure DOM is accessible
      });
    }
    
    // Default: unknown action
    return { error: 'Unknown action: ' + message.action };
  });
  
  logDebug('Message handlers set up');
}

// Initialize the content script
function initialize() {
  logDebug('Content script initializing');
  setupMessageHandlers();
  logDebug('Content script initialized');
}

// Start initialization
initialize();