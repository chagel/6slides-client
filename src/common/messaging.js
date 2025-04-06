/**
 * Notion to Slides - Messaging Module
 * 
 * Handles communication between extension components
 */

import { loggingService } from '../services/LoggingService.js';

/**
 * Send a message to the content script
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message to send
 * @returns {Promise<any>} - Response from content script
 */
export function sendToContent(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          loggingService.error('Error sending message to content script', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        resolve(response);
      });
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        reject(new Error('Message timeout: No response from content script'));
      }, 10000); // 10 seconds timeout
    } catch (error) {
      loggingService.error('Failed to send message to content script', error);
      reject(error);
    }
  });
}

/**
 * Send a message to the background script
 * @param {Object} message - Message to send
 * @returns {Promise<any>} - Response from background script
 */
export function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          loggingService.error('Error sending message to background script', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        resolve(response);
      });
      
      // Set a timeout to reject the promise if no response is received
      setTimeout(() => {
        reject(new Error('Message timeout: No response from background script'));
      }, 5000); // 5 seconds timeout
    } catch (error) {
      loggingService.error('Failed to send message to background script', error);
      reject(error);
    }
  });
}

/**
 * Add a message listener that returns a promise
 * @param {Function} listener - Message listener function
 * @returns {Function} - Function to remove the listener
 */
export function addMessageListener(listener) {
  const wrappedListener = (message, sender, sendResponse) => {
    try {
      // Call the listener and handle both promises and direct returns
      const result = listener(message, sender);
      
      if (result instanceof Promise) {
        // For async listeners, keep the message channel open
        result
          .then(sendResponse)
          .catch(error => {
            loggingService.error('Error in async message listener', error);
            sendResponse({ error: error.message });
          });
        
        return true; // Keep the message channel open
      } else {
        // For synchronous listeners, send the response immediately
        sendResponse(result);
        return false;
      }
    } catch (error) {
      loggingService.error('Error in message listener', error);
      sendResponse({ error: error.message });
      return false;
    }
  };
  
  chrome.runtime.onMessage.addListener(wrappedListener);
  
  // Return a function to remove the listener
  return () => {
    chrome.runtime.onMessage.removeListener(wrappedListener);
  };
}