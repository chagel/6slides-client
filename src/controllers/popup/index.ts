/**
 * Six Slides - Popup Script
 * 
 * Handles the popup UI and initiates the content extraction process.
 */

import { loggingService } from '../../services/logging_service';
import { messagingService } from '../../services/messaging_service';
import { storage } from '../../models/storage';
import { configManager } from '../../models/config_manager';
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
  private exportBtn: HTMLButtonElement | null;
  private customizeBtn: HTMLButtonElement | null;
  private statusEl: HTMLElement;
  private instructionsLink: HTMLAnchorElement;
  private settingsLink: HTMLAnchorElement;
  private templateInfo: HTMLElement;
  private presentationStats: HTMLElement;
  // No retry counter needed with recursive approach
  
  /**
   * Constructor for the popup controller
   */
  constructor() {
    this.convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn');
    this.customizeBtn = document.getElementById('customizeBtn');
    this.statusEl = document.getElementById('status') as HTMLElement;
    this.instructionsLink = document.getElementById('instructionsLink') as HTMLAnchorElement;
    this.settingsLink = document.getElementById('settingsLink') as HTMLAnchorElement;
    this.templateInfo = document.getElementById('template-info') as HTMLElement;
    this.presentationStats = document.getElementById('presentation-stats') as HTMLElement;
    
    this.bindEventHandlers();
    
    // Initialize async operations
    this.initializeAsync();
  }
  
  /**
   * Initialize async operations
   */
  private async initializeAsync(): Promise<void> {
    await this.checkCurrentPage();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Convert button
    this.convertBtn.addEventListener('click', this.handleConvertClick.bind(this));
    
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', this.handleExportClick.bind(this));
    }
    
    // Customize button
    if (this.customizeBtn) {
      this.customizeBtn.addEventListener('click', this.handleCustomizeClick.bind(this));
    }
    
    // Links
    this.instructionsLink.addEventListener('click', this.handleInstructionsClick.bind(this));
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

        // return; // debug breakpoint
        
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
   * Handle settings link click
   * @param e - Click event
   */
  private handleSettingsClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#settings') });
  }
  
  /**
   * Handle customize button click - redirects to presentation settings
   * @param e - Click event
   */
  private handleCustomizeClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html#settings') });
    
    // Log customize action
    loggingService.info('Customize presentation clicked', null, 'popup');
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
   * Update presentation stats and manage export button visibility
   * @param slides - The slides to display stats for
   */
  private async updatePresentationStats(slides: Slide[] = []): Promise<void> {
    try {
      const slideCountEl = document.getElementById('slide-count');
      const subslideCountEl = document.getElementById('subslide-count');
      const presentationThemeEl = document.getElementById('presentation-theme');
      const exportBtn = document.getElementById('exportBtn');
      
      if (!slideCountEl || !subslideCountEl || !presentationThemeEl) {
        return;
      }
      
      // If no slides provided, try to load from storage
      let presentationSlides = slides;
      if (slides.length === 0) {
        presentationSlides = await storage.getSlides();
      }
      
      // Calculate stats
      const slideCount = presentationSlides.length;
      
      // Count all subslides from all slides
      let subslideCount = 0;
      for (const slide of presentationSlides) {
        if (slide.subslides && Array.isArray(slide.subslides)) {
          subslideCount += slide.subslides.length;
        }
      }
      
      // Get theme from config
      const config = await configManager.getConfig();
      const theme = config.theme || 'Default';
      
      // Update UI
      slideCountEl.textContent = String(slideCount);
      subslideCountEl.textContent = String(subslideCount);
      presentationThemeEl.textContent = theme;
      
      // Check subscription status for export feature
      if (exportBtn) {
        const hasPro = await configManager.hasPro();
        
        if (!hasPro) {
          // Show PRO upgrade message on export button for free users, but don't disable
          exportBtn.classList.add('pro-feature-btn');
          exportBtn.innerHTML = `
            <span>PDF Export</span> <span class="pro-badge">PRO</span>
          `;
          
          // Add click handler to upgrade
          exportBtn.removeEventListener('click', this.handleExportClick.bind(this));
          exportBtn.addEventListener('click', this.handleProUpgradeClick.bind(this));
        }
      }
      
      loggingService.debug('Updated presentation stats', {
        slideCount,
        subslideCount,
        theme
      }, 'popup');
    } catch (error) {
      loggingService.error('Error updating presentation stats', error, 'popup');
    }
  }
  
  /**
   * Handle export button click to export as PDF
   */
  private async handleExportClick(): Promise<void> {
    try {
      // First check if the user has PRO subscription
      const hasPro = await configManager.hasPro();
      
      if (!hasPro) {
        // User doesn't have PRO, redirect to upgrade page instead
        this.handleProUpgradeClick(new MouseEvent('click'));
        return;
      }
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        this.updateStatus('No active presentation tab found', 'not-ready');
        return;
      }
      
      // Check if we're on the viewer page
      const viewerUrl = chrome.runtime.getURL('viewer.html');
      if (!tab.url?.includes(viewerUrl)) {
        this.updateStatus('Not in presentation mode', 'not-ready');
        return;
      }
      
      // Create URL with print-pdf parameter and handle slide anchors properly
      const url = new URL(tab.url || '');
      
      // Save any hash/anchor for slide position (like #/2/3)
      const slideHash = url.hash;
      
      // Remove the hash for the redirection
      url.hash = '';
      
      // Add print-pdf parameter
      if (!url.searchParams.has('print-pdf')) {
        url.searchParams.set('print-pdf', 'true');
      }
      
      // Get the clean URL without slide position
      let printUrl = url.toString();
      
      // Log the details for debugging
      loggingService.debug('PDF export URL details', {
        originalUrl: tab.url,
        printUrl,
        slideHash
      }, 'popup');
      
      // Update the tab URL to include the print-pdf parameter
      await chrome.tabs.update(tab.id, { url: printUrl });
      this.updateStatus('Opening print dialog...', 'ready');
      
      // The print dialog will be automatically triggered by the viewer page
      // which looks for the print-pdf parameter in the URL on load
      loggingService.info('PDF export initiated', { url: printUrl }, 'popup');
      
      // After a short delay, close the popup to get out of the way of the print dialog
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      loggingService.error('Error exporting slides as PDF', error, 'popup');
      this.updateStatus('Error exporting slides', 'not-ready');
    }
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
    chrome.tabs.create({ url: `${process.env.WEB_URL}/subscription` });
  }
  
  /**
   * Handle subscription link click
   * @param e - Click event
   */
  private handleSubscriptionLinkClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: `${process.env.WEB_URL}` });
  }
  
  /**
   * Handle click on PRO feature for free users
   * @param e - Click event
   */
  private handleProUpgradeClick(e: MouseEvent): void {
    e.preventDefault();
    // Redirect to subscription page
    chrome.tabs.create({ url: `${process.env.WEB_URL}/subscription` });
    loggingService.info('User clicked on PRO feature upgrade (PDF Export)', null, 'popup');
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
        // We are currently on the viewer.html page - show presentation stats
        this.templateInfo.style.display = 'none';
        this.presentationStats.style.display = 'block';
        
        // Update button state
        this.updateStatus('Currently in presentation mode', 'ready');
        this.convertBtn.disabled = true;
        this.convertBtn.textContent = 'Presenting...';
        
        // Update presentation stats
        await this.updatePresentationStats();
      } else {
        // Not in presentation mode - show template info
        this.templateInfo.style.display = 'block';
        this.presentationStats.style.display = 'none';
        
        if (!pageInfo.compatible) {
          this.updateStatus('Not on a Notion page.', 'not-ready');
          this.convertBtn.disabled = true;
        } else {
          this.updateStatus('Ready! Ensure Notion page with required format.', 'ready');
        }
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
