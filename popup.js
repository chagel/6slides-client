/**
 * Notion to Slides - Popup Script
 * 
 * Handles the popup UI and initiates the content extraction process.
 */

document.addEventListener('DOMContentLoaded', () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusEl = document.getElementById('status');
  const instructionsLink = document.getElementById('instructionsLink');
  const themeSelector = document.getElementById('themeSelector');
  
  // Instructions link functionality
  instructionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#instructions') });
  });
  
  // Set theme selector to saved value or default
  const savedTheme = localStorage.getItem('selectedTheme') || 'default';
  themeSelector.value = savedTheme;
  
  // Save theme selection
  themeSelector.addEventListener('change', () => {
    localStorage.setItem('selectedTheme', themeSelector.value);
    console.log(`Theme changed to: ${themeSelector.value}`);
  });
  
  /**
   * Update status message in the popup
   * @param {string} message - Message to display
   * @param {string|null} statusType - Optional status type: 'ready', 'not-ready', or null for no indicator
   */
  function updateStatus(message, statusType = null) {
    // Clear previous content
    statusEl.innerHTML = '';
    
    // Create status indicator dot if statusType is provided
    if (statusType) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator ${statusType}`;
      statusEl.appendChild(indicator);
    }
    
    // Add message text
    const messageText = document.createTextNode(message);
    statusEl.appendChild(messageText);
    
    console.log('Status:', message, statusType ? `(${statusType})` : '');
  }
  
  /**
   * Check if we're on a Notion page or other supported page
   * @returns {Promise<Object>} Object with compatible flag and page type
   */
  async function checkIsCompatiblePage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Notion domains
    if (tab.url.includes('notion.so') || tab.url.includes('notion.site')) {
      return { compatible: true, type: 'notion' };
    }
    
    // Could add other compatible site checks here
    
    return { compatible: false };
  }
  
  /**
   * Try to inject content script if not already there
   * @param {Object} tab - The active tab object
   * @returns {Promise<boolean>} Whether content script is loaded
   */
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
        updateStatus('Error: Please navigate to a Notion page.', 'not-ready');
        convertBtn.disabled = false;
        return;
      }
      
      updateStatus('Checking template format...');
      
      // Make sure content script is loaded
      const contentScriptLoaded = await ensureContentScriptLoaded(tab);
      if (!contentScriptLoaded) {
        updateStatus('Error: Could not initialize content extraction.', 'not-ready');
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
          updateStatus('Error: Could not communicate with the page.', 'not-ready');
          convertBtn.disabled = false;
          return;
        }
        
        if (response && response.slides && response.slides.length > 0) {
          updateStatus(`Found ${response.slides.length} slides! Creating presentation...`, 'ready');
          
          // Store debug info
          const debugInfo = {
            timestamp: new Date().toISOString(),
            pageType: pageInfo.type,
            url: tab.url,
            slideCount: response.slides.length
          };
          
          // Store slides, debug info, and ensure theme is saved
          localStorage.setItem('slides', JSON.stringify(response.slides));
          localStorage.setItem('slideDebugInfo', JSON.stringify(debugInfo));
          
          // Make sure selected theme is saved (in case it was just changed)
          localStorage.setItem('selectedTheme', themeSelector.value);
          
          // Open viewer in a new tab
          chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
        } else if (response && response.error) {
          console.error('Extraction error details:', response);
          updateStatus(`Error: ${response.error}`, 'not-ready');
          
          // Store error info for debugging
          localStorage.setItem('slideError', JSON.stringify({
            error: response.error,
            stack: response.stack,
            timestamp: new Date().toISOString()
          }));
        } else {
          updateStatus('Error: No slides found. Make sure your page follows the template format and has at least one H1 heading.', 'not-ready');
        }
        
        convertBtn.disabled = false;
      });
    } catch (error) {
      console.error('Error:', error);
      updateStatus(`Error: ${error.message}`, 'not-ready');
      convertBtn.disabled = false;
    }
  });
  
  // About link functionality
  document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
  
  // Check if current tab is viewer.html
  function isCurrentTabViewer() {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([currentTab]) => {
        const currentTabUrl = currentTab?.url || '';
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        
        resolve(currentTabUrl.includes(viewerUrl));
      });
    });
  }

  // Initial page check
  Promise.all([checkIsCompatiblePage(), isCurrentTabViewer()]).then(([pageInfo, isViewer]) => {
    if (isViewer) {
      // We are currently on the viewer.html page
      updateStatus('Currently in presentation mode', 'ready');
      convertBtn.disabled = true;
      convertBtn.textContent = 'Presenting...';
    } else if (!pageInfo.compatible) {
      updateStatus('Not on a Notion page.', 'not-ready');
      convertBtn.disabled = true;
    } else {
      updateStatus('Ready! Ensure Notion page with required format.', 'ready');
    }
  });
});
