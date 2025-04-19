/**
 * Notion to Slides - Popup Script
 * 
 * Handles the popup UI and initiates the content extraction process.
 */

import { loggingService } from '../../services/logging_service';
import { messagingService } from '../../services/messaging_service';
import { storage } from '../../models/storage';
import { configManager } from '../../models/config_manager';
import { debugService } from '../../services/debug_service';
import { authService } from '../../services/auth_service';
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
    
    // Initialize async operations
    this.initializeAsync();
  }
  
  /**
   * Initialize async operations
   */
  private async initializeAsync(): Promise<void> {
    // Add debug indicator if debug mode is enabled
    await this.setupDebugIndicator();
    
    // Check current page
    await this.checkCurrentPage();
  }
  
  /**
   * Setup debug indicator
   */
  private async setupDebugIndicator(): Promise<void> {
    try {
      await debugService.setupDebugIndicator(
        {
          position: 'top-right',
          text: 'DEBUG',
          zIndex: 1000
        },
        'popup'  // Context identifier for logging
      );
    } catch (_) {
      // Error handled silently - debug indicator is not critical
    }
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
    
    // No need to log every status update
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
      loggingService.error('Error checking if page is compatible', error, 'popup');
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
            // Script not loaded, try to inject it
            chrome.scripting.executeScript({
              target: { tabId: tab.id as number },
              files: ['app.js']
            }).then(() => {
              resolve(true);
            }).catch(err => {
              loggingService.error('Failed to inject content script', err, 'popup');
              resolve(false);
            });
          } else {
            // Content script is already loaded
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

    // Validate subscription data
    await chrome.runtime.sendMessage({ action: 'validate_subscription' });
    
    // Log subscription status when beginning extraction
    const hasPro = await configManager.hasPro();
    const { level } = await configManager.getSubscription();
    loggingService.info(`Starting extraction with subscription level: ${level?.toUpperCase() || 'FREE'} (Has Pro: ${hasPro ? 'Yes' : 'No'})`, null, 'popup');
    
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
      // Log that we're starting extraction
      loggingService.info('Starting content extraction process', null, 'popup');
      
      const response = await messagingService.sendToContent((pageInfo.tab as chrome.tabs.Tab).id as number, { 
        action: 'extract_content',
        pageType: pageInfo.type
      }) as ContentResponse;
      
      if (response && response.slides && response.slides.length > 0) {
        this.updateStatus(`Found ${response.slides.length} slides! Creating presentation...`, 'ready');
        
        // Log debug info
        loggingService.debug('Popup extraction complete', {
          sourceType: pageInfo.type,
          url: (pageInfo.tab as chrome.tabs.Tab).url,
          slideCount: response.slides.length
        });
        
        // Store slides
        await storage.saveSlides(response.slides);
        
        // Open viewer in the current tab
        if ((pageInfo.tab as chrome.tabs.Tab).id) {
          chrome.tabs.update((pageInfo.tab as chrome.tabs.Tab).id as number, { 
            url: chrome.runtime.getURL('viewer.html') 
          });
        }
        
        // Close the popup
        window.close();
      } else if (response && response.error) {
        // Log error details
        loggingService.error('Extraction error', {
          message: response.error,
          stack: response.stack,
          details: response
        });
        this.updateStatus(`Error: ${response.error}`, 'not-ready');
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
   * Update subscription badge based on current subscription status
   */
  private async updateSubscriptionBadge(): Promise<void> {
    try {
      const subscriptionBadge = document.getElementById('subscription-badge');
      if (!subscriptionBadge) return;
      
      // Get subscription status from background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'auth',
        authAction: 'check'
      });
      
      const subscription = response.subscription;
      const level = subscription?.level;
      const expiryTimestamp = subscription?.expiry;
      
      // Determine if user has pro features
      const hasPro = (
        (level === 'pro' || level === 'vip') && 
        (expiryTimestamp === null || expiryTimestamp > Date.now())
      );
      
      // Reset all classes
      subscriptionBadge.className = 'subscription-badge';
      
      // Set appropriate class and text based on subscription
      if (hasPro) {
        if (level === 'pro') {
          subscriptionBadge.classList.add('pro');
          subscriptionBadge.textContent = 'PRO';
        } else if (level === 'vip') {
          subscriptionBadge.classList.add('vip');
          subscriptionBadge.textContent = 'VIP';
        }
      } else {
        subscriptionBadge.classList.add('free');
        subscriptionBadge.textContent = 'FREE';
      }
      
      // Log subscription status
      loggingService.debug('Subscription status', { 
        level, 
        hasPro, 
        expiry: expiryTimestamp 
      }, 'popup');
    } catch (error) {
      loggingService.error('Error updating subscription badge', error, 'popup');
    }
  }
  
  /**
   * Check the current page and update UI accordingly
   */
  private async checkCurrentPage(): Promise<void> {
    try {
      // Update subscription badge (async now)
      await this.updateSubscriptionBadge();
      
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
      loggingService.error('Error checking current page', error, 'popup');
      this.updateStatus('Error checking page status.', 'not-ready');
    }
  }
}

// Flag to track initialization in this popup instance
let popupInitialized = false;

/**
 * Initialize the popup
 */
function initialize(): void {
  // Initialize when DOM is ready - use the once option to prevent multiple triggers
  document.addEventListener('DOMContentLoaded', () => {
    if (popupInitialized) {
      return;
    }
    
    try {
      // Set flag to prevent double initialization within a single popup session
      popupInitialized = true;
      
      // Create popup controller
      const popupController = new PopupController();
      
      // Add a single log to indicate popup is ready
      loggingService.info('Popup initialized', null, 'popup');
    } catch (error) {
      loggingService.error('Error initializing popup', error, 'popup');
    }
  }, { once: true }); // Use once: true for extra protection
}

// Start initialization
initialize();
