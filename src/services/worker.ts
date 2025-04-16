// Notion to Slides - Service Worker
import { messagingService } from './messaging_service';

// Open the viewer in a new tab
function openViewer(): Promise<{success: boolean}> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') }, () => {
      resolve({ success: true });
    });
  });
}

// Set up message handlers
messagingService.addMessageListener((message) => {
  // Handle viewer request
  if (message.action === 'open_viewer') {
    return openViewer();
  }
  // Default response for unhandled messages
  return { error: 'Unhandled message action: ' + message.action };
});
