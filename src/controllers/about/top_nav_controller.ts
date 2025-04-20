/**
 * Notion to Slides - Top Navigation Controller
 * 
 * Handles the top navigation functionality including user info and subscription status
 */

import { loggingService } from '../../services/logging_service';
import { authService } from '../../services/auth_service';
import { configManager } from '../../models/config_manager';

/**
 * TopNavController class to handle the top navigation functionality
 */
export class TopNavController {
  // UI Elements
  private subscriptionBadgeEl: HTMLElement | null;
  private userEmailEl: HTMLElement | null;
  private pageTitleEl: HTMLElement | null;

  /**
   * Constructor for the Top Navigation controller
   */
  constructor() {
    this.subscriptionBadgeEl = document.getElementById('subscription-badge-topnav');
    this.userEmailEl = document.getElementById('user-email-topnav');
    this.pageTitleEl = document.getElementById('page-title');
    
    this.initialize();
  }
  
  /**
   * Initialize the controller
   */
  private async initialize(): Promise<void> {
    try {
      await this.updateUserInfo();
      this.listenForAuthChanges();
      
      // Initialize with the current hash
      this.updatePageTitle();
      
      // Listen for hash changes to update the title
      window.addEventListener('hashchange', this.updatePageTitle.bind(this));
      
      loggingService.debug('Top navigation initialized', {}, 'top_nav_controller');
    } catch (error) {
      loggingService.error('Failed to initialize top navigation', error, 'top_nav_controller');
    }
  }
  
  /**
   * Update user information in the top navigation
   */
  private async updateUserInfo(): Promise<void> {
    try {
      if (!this.subscriptionBadgeEl || !this.userEmailEl) {
        loggingService.warn('Top navigation elements not found', {}, 'top_nav_controller');
        return;
      }
      
      // Get current user and subscription info
      const isLoggedIn = await authService.isLoggedIn();
      const userInfo = await authService.getCurrentUser();
      const { level, expiry } = await configManager.getSubscription();
      
      // Update subscription badge
      const hasPro = (
        (level === 'pro' || level === 'vip') && 
        (expiry === null || expiry > Date.now())
      );
      
      // Reset all classes
      this.subscriptionBadgeEl.className = 'subscription-badge';
      
      // Set appropriate class and text based on subscription
      if (hasPro) {
        if (level === 'pro') {
          this.subscriptionBadgeEl.classList.add('pro');
          this.subscriptionBadgeEl.textContent = 'PRO';
        } else if (level === 'vip') {
          this.subscriptionBadgeEl.classList.add('vip');
          this.subscriptionBadgeEl.textContent = 'VIP';
        }
      } else {
        this.subscriptionBadgeEl.classList.add('free');
        this.subscriptionBadgeEl.textContent = 'FREE';
      }
      
      // Update user email display
      if (isLoggedIn && userInfo && userInfo.email) {
        this.userEmailEl.textContent = userInfo.email;
      } else {
        this.userEmailEl.textContent = 'Not signed in';
      }
      
      loggingService.debug('Updated user info in top nav', {
        isLoggedIn,
        subscription: level,
        email: userInfo?.email
      }, 'top_nav_controller');
    } catch (error) {
      loggingService.error('Error updating user info in top nav', error, 'top_nav_controller');
    }
  }
  
  /**
   * Update page title based on current hash
   */
  private updatePageTitle(): void {
    if (!this.pageTitleEl) return;
    
    // Get current hash without the #
    let hash = window.location.hash.substring(1);
    
    // Default to 'about' if no hash
    if (!hash) {
      hash = 'about';
    }
    
    // Set title based on the current section
    switch (hash) {
      case 'about':
        this.pageTitleEl.textContent = 'About';
        break;
      case 'settings':
        this.pageTitleEl.textContent = 'Settings';
        break;
      case 'subscription':
        this.pageTitleEl.textContent = 'Subscription';
        break;
      case 'help':
        this.pageTitleEl.textContent = 'Help';
        break;
      case 'developer':
        this.pageTitleEl.textContent = 'Developer';
        break;
      default:
        this.pageTitleEl.textContent = 'Notion to Slides';
    }
  }
  
  /**
   * Listen for authentication state changes
   */
  private listenForAuthChanges(): void {
    // Set up message listener for auth events from background
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.action === 'auth_state_changed') {
        loggingService.debug('Auth state changed, updating top nav', {}, 'top_nav_controller');
        this.updateUserInfo();
      }
      return true;
    });
  }
}