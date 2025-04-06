/**
 * Notion to Slides - Background Script
 * 
 * Handles communication between popup and content scripts.
 */

import { addMessageListener } from '../common/messaging';

/**
 * Response from the viewer opening operation
 */
interface ViewerResponse {
  success: boolean;
}

/**
 * Open the viewer in a new tab
 * @returns Promise resolving to success status
 */
function openViewer(): Promise<ViewerResponse> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') }, () => {
      resolve({ success: true });
    });
  });
}

/**
 * Set up message handlers
 */
function setupMessageHandlers(): void {
  addMessageListener((message, sender) => {
    console.log('Background script received message', { message, sender });
    
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
function initialize(): void {
  console.log('Background service worker initializing');
  
  // Set up message handlers
  setupMessageHandlers();
  
  console.log('Background service worker initialized');
}

// Start initialization
initialize();