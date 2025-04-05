document.addEventListener('DOMContentLoaded', () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusEl = document.getElementById('status');
  
  // Update status message
  function updateStatus(message) {
    statusEl.textContent = message;
    console.log('Status:', message);
  }
  
  // Check if we're on a Notion page or other supported page
  async function checkIsCompatiblePage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Notion domains
    if (tab.url.includes('notion.so') || tab.url.includes('notion.site')) {
      return { compatible: true, type: 'notion' };
    }
    
    // Could add other supported sites here
    
    return { compatible: false };
  }
  
  // Try to inject content script if not already there
  async function ensureContentScriptLoaded(tab) {
    try {
      // First try to send a ping message to see if content script is loaded
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
          if (chrome.runtime.lastError || !response) {
            console.log('Content script not yet loaded, injecting...');
            
            // Script not loaded, try to inject it
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }).then(() => {
              console.log('Content script injected successfully');
              resolve(true);
            }).catch(err => {
              console.error('Failed to inject content script:', err);
              resolve(false);
            });
          } else {
            console.log('Content script already loaded');
            resolve(true);
          }
        });
        
        // Set a timeout just in case
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      console.error('Error ensuring content script loaded:', error);
      return false;
    }
  }
  
  // Handle convert button click
  convertBtn.addEventListener('click', async () => {
    // Disable button during processing
    convertBtn.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageInfo = await checkIsCompatiblePage();
      
      if (!pageInfo.compatible) {
        updateStatus('Error: Unsupported page. Please navigate to a Notion page.');
        convertBtn.disabled = false;
        return;
      }
      
      updateStatus('Preparing to extract content...');
      
      // Make sure content script is loaded
      const contentScriptLoaded = await ensureContentScriptLoaded(tab);
      if (!contentScriptLoaded) {
        updateStatus('Error: Could not initialize content extraction.');
        convertBtn.disabled = false;
        return;
      }
      
      updateStatus('Extracting content from page...');
      
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { 
        action: 'extract_content',
        pageType: pageInfo.type
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          updateStatus('Error: Could not communicate with the page.');
          convertBtn.disabled = false;
          return;
        }
        
        if (response && response.slides && response.slides.length > 0) {
          updateStatus(`Found ${response.slides.length} slides. Creating presentation...`);
          
          // Store debug info
          const debugInfo = {
            timestamp: new Date().toISOString(),
            pageType: pageInfo.type,
            url: tab.url,
            slideCount: response.slides.length
          };
          
          // Store slides and debug info
          localStorage.setItem('slides', JSON.stringify(response.slides));
          localStorage.setItem('slideDebugInfo', JSON.stringify(debugInfo));
          
          // Open viewer in a new tab
          chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
        } else if (response && response.error) {
          updateStatus(`Error: ${response.error}`);
        } else {
          updateStatus('Error: No content found. Try scrolling through the page first.');
        }
        
        convertBtn.disabled = false;
      });
    } catch (error) {
      console.error('Error:', error);
      updateStatus(`Error: ${error.message}`);
      convertBtn.disabled = false;
    }
  });
  
  // Initial check
  checkIsCompatiblePage().then(pageInfo => {
    if (!pageInfo.compatible) {
      updateStatus('Not on a supported page. Navigate to a Notion page to convert.');
      convertBtn.disabled = true;
    } else {
      updateStatus('Ready to convert page to slides.');
    }
  });
});