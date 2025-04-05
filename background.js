// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);
  
  // Handle any messages that should be processed by the background script
  if (request.action === "open_viewer") {
    chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
    sendResponse({ success: true });
  }
  
  // Return true for async responses
  return true;
});

// Log when the background service worker is installed
console.log("Notion Slides background service worker initialized");