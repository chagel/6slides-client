/**
 * Notion to Slides - Popup Script
 * 
 * Handles the popup UI and initiates the content extraction process.
 */

import { loggingService } from '../../services/LoggingService';
import { messagingService } from '../../services/MessagingService';
import { storage } from '../../models/storage';
import { DebugInfo } from '../../types/storage';
import { Slide } from '../../types/index';

/**
 * Response from content script
 */
interface ContentResponse {
  slides?: Slide[];
  error?: string;
  stack?: string;
}

/**
 * Compatible page info
 */
interface PageInfo {
  compatible: boolean;
  type?: string;
  tab?: chrome.tabs.Tab;
  error?: Error;
}

/**
 * PopupController class to handle popup UI logic
 */
class PopupController {
  private convertBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private instructionsLink: HTMLAnchorElement;
  private aboutLink: HTMLAnchorElement;
  private settingsLink: HTMLAnchorElement;
  
  /**
   * Constructor for the popup controller
   */
  constructor() {
    this.convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
    this.statusEl = document.getElementById('status') as HTMLElement;
    this.instructionsLink = document.getElementById('instructionsLink') as HTMLAnchorElement;
    this.aboutLink = document.getElementById('aboutLink') as HTMLAnchorElement;
    this.settingsLink = document.getElementById('settingsLink') as HTMLAnchorElement;
    
    this.bindEventHandlers();
    this.checkCurrentPage();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Convert button
    this.convertBtn.addEventListener('click', this.handleConvertClick.bind(this));
    
    // Links
    this.instructionsLink.addEventListener('click', this.handleInstructionsClick.bind(this));
    this.aboutLink.addEventListener('click', this.handleAboutClick.bind(this));
    this.settingsLink.addEventListener('click', this.handleSettingsClick.bind(this));
  }
  
  /**
   * Update status message in the popup
   * @param message - Message to display
   * @param statusType - Optional status type: 'ready', 'not-ready', or null for no indicator
   */
  private updateStatus(message: string, statusType: 'ready' | 'not-ready' | null = null): void {
    // Clear previous content
    this.statusEl.innerHTML = '';
    
    // Create status indicator dot if statusType is provided
    if (statusType) {
      const indicator = document.createElement('span');
      indicator.className = `status-indicator ${statusType}`;
      this.statusEl.appendChild(indicator);
    }
    
    // Add message text
    const messageText = document.createTextNode(message);
    this.statusEl.appendChild(messageText);
    
    loggingService.debug('Status updated', { message, statusType });
  }
  
  /**
   * Check if we're on a Notion page or other supported page
   * @returns Promise with object containing compatible flag and page type
   */
  private async checkIsCompatiblePage(): Promise<PageInfo> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Notion domains
      if (tab.url && (tab.url.includes('notion.so') || tab.url.includes('notion.site'))) {
        return { compatible: true, type: 'notion', tab };
      }
      
      // Could add other compatible site checks here
      
      return { compatible: false, tab };
    } catch (error) {
      loggingService.error('Error checking if page is compatible', error);
      return { compatible: false, error: error as Error };
    }
  }
  
  /**
   * Try to inject content script if not already there
   * @param tab - The active tab object
   * @returns Promise with whether content script is loaded
   */
  private async ensureContentScriptLoaded(tab: chrome.tabs.Tab): Promise<boolean> {
    try {
      if (!tab.id) {
        return false;
      }
      
      // First try to send a ping message to see if content script is loaded
      return new Promise<boolean>((resolve) => {
        chrome.tabs.sendMessage(tab.id as number, { action: 'ping' }, response => {
          // Check for runtime error (happens when content script is not loaded)
          if (chrome.runtime.lastError || !response) {
            loggingService.debug('Content script not yet loaded, injecting...');
            
            // Script not loaded, try to inject it
            chrome.scripting.executeScript({
              target: { tabId: tab.id as number },
              files: ['content/entry.js']
            }).then(() => {
              loggingService.debug('Content script injected successfully');
              resolve(true);
            }).catch(err => {
              loggingService.error('Failed to inject content script', err);
              resolve(false);
            });
          } else {
            loggingService.debug('Content script already loaded');
            resolve(true);
          }
        });
        
        // Set a timeout just in case
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      loggingService.error('Error ensuring content script loaded', error);
      return false;
    }
  }
  
  /**
   * Handle convert button click
   */
  private async handleConvertClick(): Promise<void> {
    // Disable button during processing
    this.convertBtn.disabled = true;
    
    try {
      const pageInfo = await this.checkIsCompatiblePage();
      
      if (!pageInfo.compatible) {
        this.updateStatus('Error: Please navigate to a Notion page.', 'not-ready');
        this.convertBtn.disabled = false;
        return;
      }
      
      this.updateStatus('Checking template format...');
      
      // Make sure content script is loaded
      const contentScriptLoaded = await this.ensureContentScriptLoaded(pageInfo.tab as chrome.tabs.Tab);
      if (!contentScriptLoaded) {
        this.updateStatus('Error: Could not initialize content extraction.', 'not-ready');
        this.convertBtn.disabled = false;
        return;
      }
      
      this.updateStatus('Extracting content from page...');
      
      // Send message to content script
      const response = await messagingService.sendToContent((pageInfo.tab as chrome.tabs.Tab).id as number, { 
        action: 'extract_content',
        pageType: pageInfo.type
      }) as ContentResponse;
      
      if (response && response.slides && response.slides.length > 0) {
        this.updateStatus(`Found ${response.slides.length} slides! Creating presentation...`, 'ready');
        
        // Store debug info
        const debugInfo: Partial<DebugInfo> = {
          timestamp: new Date().toISOString(),
          sourceType: pageInfo.type,
          url: (pageInfo.tab as chrome.tabs.Tab).url,
          slideCount: response.slides.length,
          logs: []
        };
        
        // Store slides and debug info
        await storage.saveSlides(response.slides);
        storage.saveDebugInfo(debugInfo);
        
        // Open viewer in the current tab
        if ((pageInfo.tab as chrome.tabs.Tab).id) {
          chrome.tabs.update((pageInfo.tab as chrome.tabs.Tab).id as number, { 
            url: chrome.runtime.getURL('viewer.html') 
          });
        }
        
        // Close the popup
        window.close();
      } else if (response && response.error) {
        loggingService.error('Extraction error details', response);
        this.updateStatus(`Error: ${response.error}`, 'not-ready');
        
        // Store error info for debugging
        storage.saveErrorInfo({
          message: response.error,
          stack: response.stack
        });
      } else {
        this.updateStatus('Error: No slides found. Make sure your page follows the template format and has at least one H1 heading.', 'not-ready');
      }
    } catch (error) {
      loggingService.error('Error converting page', error);
      this.updateStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'not-ready');
    } finally {
      this.convertBtn.disabled = false;
    }
  }
  
  /**
   * Handle instructions link click
   * @param e - Click event
   */
  private handleInstructionsClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#help') });
  }
  
  /**
   * Handle about link click
   * @param e - Click event
   */
  private handleAboutClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#about') });
  }
  
  /**
   * Handle settings link click
   * @param e - Click event
   */
  private handleSettingsClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#settings') });
  }
  
  /**
   * Check if current tab is viewer.html
   * @returns Promise resolving to boolean
   */
  private async isCurrentTabViewer(): Promise<boolean> {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([currentTab]) => {
        const currentTabUrl = currentTab?.url || '';
        const viewerUrl = chrome.runtime.getURL('viewer.html');
        
        resolve(currentTabUrl.includes(viewerUrl));
      });
    });
  }
  
  /**
   * Check the current page and update UI accordingly
   */
  private async checkCurrentPage(): Promise<void> {
    try {
      const [pageInfo, isViewer] = await Promise.all([
        this.checkIsCompatiblePage(),
        this.isCurrentTabViewer()
      ]);
      
      if (isViewer) {
        // We are currently on the viewer.html page
        this.updateStatus('Currently in presentation mode', 'ready');
        this.convertBtn.disabled = true;
        this.convertBtn.textContent = 'Presenting...';
      } else if (!pageInfo.compatible) {
        this.updateStatus('Not on a Notion page.', 'not-ready');
        this.convertBtn.disabled = true;
      } else {
        this.updateStatus('Ready! Ensure Notion page with required format.', 'ready');
      }
    } catch (error) {
      loggingService.error('Error checking current page', error);
      this.updateStatus('Error checking page status.', 'not-ready');
    }
  }
}

/**
 * Initialize the popup
 */
function initialize(): void {
  loggingService.debug('Popup initializing');
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Create popup controller
      const popupController = new PopupController();
      loggingService.debug('Popup initialization complete');
    } catch (error) {
      loggingService.error('Error initializing popup', error);
    }
  });
}

// Start initialization
initialize();