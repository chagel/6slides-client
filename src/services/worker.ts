/**
 * Notion to Slides - Service Worker
 * 
 * Handles background operations and communication between extension components.
 */

import { messagingService } from './MessagingService';

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
  messagingService.addMessageListener((message, sender) => {
    console.log('Service worker received message', { message, sender });
    
    // Handle any messages that should be processed by the service worker
    if (message.action === 'open_viewer') {
      return openViewer();
    }
    
    // Default response for unhandled messages
    return { error: 'Unhandled message action: ' + message.action };
  });
}

/**
 * Initialize the service worker
 */
function initialize(): void {
  console.log('Service worker initializing');
  
  // Set up message handlers
  setupMessageHandlers();
  
  console.log('Service worker initialized');
}

// Start initialization
initialize();