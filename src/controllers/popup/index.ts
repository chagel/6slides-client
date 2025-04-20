/**
 * Six Slides - Popup Script
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
import { showNotification } from '../../utils/notification';

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
  // aboutLink removed
  private settingsLink: HTMLAnchorElement;
  // No retry counter needed with recursive approach
  
  /**
   * Constructor for the popup controller
   */
  constructor() {
    this.convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
    this.statusEl = document.getElementById('status') as HTMLElement;
    this.instructionsLink = document.getElementById('instructionsLink') as HTMLAnchorElement;
    // aboutLink removed
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
   * Setup debug indicator in the bottom right corner
   */
  private async setupDebugIndicator(): Promise<void> {
    try {
      await debugService.setupDebugIndicator(
        {
          position: 'bottom-right',
          text: 'DEBUG MODE',
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
    // aboutLink removed
    this.settingsLink.addEventListener('click', this.handleSettingsClick.bind(this));
    
    // Account links
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
      loginLink.addEventListener('click', this.handleLoginClick.bind(this));
    }
    
    const accountLink = document.getElementById('accountLink');
    if (accountLink) {
      accountLink.addEventListener('click', this.handleAccountClick.bind(this));
    }
    
    // Subscription badge link
    const subscriptionLink = document.getElementById('subscriptionLink');
    if (subscriptionLink) {
      subscriptionLink.addEventListener('click', this.handleSubscriptionLinkClick.bind(this));
    }
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
  
  // About link handler removed
  
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
   * Update login status section in the popup
   * Shows/hides the appropriate login UI elements based on login status
   */
  private async updateLoginStatus(): Promise<void> {
    try {
      // Get account section elements
      const accountSection = document.getElementById('account-status');
      const loginLink = document.getElementById('loginLink');
      const accountLink = document.getElementById('accountLink');
      const userEmailDisplay = document.getElementById('userEmailDisplay');
      
      // Return early if elements don't exist
      if (!accountSection || !loginLink || !accountLink || !userEmailDisplay) {
        return;
      }
      
      // Always show account section regardless of debug mode
      accountSection.style.display = 'block';
      
      // Check if user is logged in
      const isLoggedIn = await authService.isLoggedIn();
      
      if (isLoggedIn) {
        // User is logged in - show account info
        loginLink.style.display = 'none';
        accountLink.style.display = 'flex';
        
        // Get and display user email
        const userInfo = await authService.getCurrentUser();
        if (userInfo && userInfo.email) {
          userEmailDisplay.textContent = userInfo.email;
        }
        // Also update subscription badge since login may have changed it
        await this.updateSubscriptionBadge();
        
        loggingService.debug('User logged in', { email: userInfo?.email }, 'popup');
      } else {
        // Check for pending login and try to complete it
        const { popupLoginPending } = await chrome.storage.local.get('popupLoginPending');
        if (popupLoginPending) {
          loggingService.info('User login pending, attempting to complete sign-in', {}, 'popup');
          
          // Don't clear flag yet - will clear after successful sign-in
          // Try to complete sign-in and get user info
          const userInfo = await authService.signIn();
          
          if (userInfo) {
            // Sign-in succeeded, clear the flag and update UI
            await chrome.storage.local.remove('popupLoginPending');
            
            // Call ourselves recursively to show logged-in state
            // The next call will go through the isLoggedIn=true path and update UI
            loggingService.debug('Sign-in successful, updating login status recursively', 
              { email: userInfo.email }, 'popup');
            
            // Recursive call to update login status
            return this.updateLoginStatus();
          }
          
          // Sign-in failed, clear flag to prevent further attempts
          await chrome.storage.local.remove('popupLoginPending');
          loggingService.debug('Sign-in completion attempt was unsuccessful', {}, 'popup');
          showNotification('Login failed. Please try again.', 'error');
        }
        // User is not logged in - show login link
        loginLink.style.display = 'flex';
        accountLink.style.display = 'none';
        
        loggingService.debug('User not logged in', {}, 'popup');
      }
    } catch (error) {
      await chrome.storage.local.remove('popupLoginPending');
      loggingService.error('Error updating login status', error, 'popup');
    }
  }
  
  /**
   * Handle login link click
   * @param e - Click event
   */
  private async handleLoginClick(e: MouseEvent): Promise<void> {
    e.preventDefault();
    
    try {
      // set popupLoginPending flag for coming back after login
      loggingService.info('User initiated login', {}, 'popup');
      
      await chrome.storage.local.set({ 'popupLoginPending': true });
      // Start the sign-in process
      const userInfo = await authService.signIn();
      
      if (userInfo) {
        // Clear the pending flag when successful
        await chrome.storage.local.remove('popupLoginPending');
        
        // Update login UI if sign-in successful
        await this.updateLoginStatus();
        loggingService.info('User logged in successfully', { email: userInfo.email }, 'popup');
      }
      else {
        loggingService.info('Signing in progress', { popupLoginPending: true }, 'popup');
      }
    } catch (error) {
      await chrome.storage.local.remove('popupLoginPending');
      loggingService.error('Login error', error, 'popup');
    }
  }
  
  /**
   * Handle account link click
   * @param e - Click event
   */
  private handleAccountClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://6slides.com/subscription' });
  }
  
  /**
   * Handle subscription link click
   * @param e - Click event
   */
  private handleSubscriptionLinkClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://6slides.com' });
  }
  
  /**
   * Check the current page and update UI accordingly
   */
  private async checkCurrentPage(): Promise<void> {
    try {
      // Update subscription badge and login status (async now)
      await Promise.all([
        this.updateLoginStatus(),
        this.updateSubscriptionBadge()
      ]);
      
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
      new PopupController();
      
      // Add a single log to indicate popup is ready
      loggingService.info('Popup initialized', null, 'popup');
    } catch (error) {
      loggingService.error('Error initializing popup', error, 'popup');
    }
  }, { once: true }); // Use once: true for extra protection
}

// Start initialization
initialize();
