/**
 * Six Slides - Top Navigation Controller
 * 
 * Handles the top navigation functionality including user info and subscription status
 */

import { loggingService } from '../../services/logging_service';
import { showNotification } from '../../utils/notification';

/**
 * TopNavController class to handle the top navigation functionality
 */
export class TopNavController {
  // UI Elements
  private subscriptionBadgeEl: HTMLElement | null;
  private userEmailEl: HTMLElement | null;
  private pageTitleEl: HTMLElement | null;
  private userInfoSection: HTMLElement | null;
  private loginSection: HTMLElement | null;
  private loginButton: HTMLElement | null;
  private logoutButton: HTMLElement | null;
  private manageSubscriptionButton: HTMLElement | null;
  private signupButton: HTMLElement | null;

  /**
   * Constructor for the Top Navigation controller
   */
  constructor() {
    this.subscriptionBadgeEl = document.getElementById('subscription-badge-topnav');
    this.userEmailEl = document.getElementById('user-email-topnav');
    this.pageTitleEl = document.getElementById('page-title');
    this.userInfoSection = document.getElementById('user-info-topnav');
    this.loginSection = document.getElementById('login-section-topnav');
    this.loginButton = document.getElementById('login-button-topnav');
    this.logoutButton = document.getElementById('logout-button-topnav');
    this.manageSubscriptionButton = document.getElementById('manage-subscription-button');
    this.signupButton = document.getElementById('signup-button-topnav');
    
    this.initialize();
  }
  
  /**
   * Initialize the controller
   */
  private async initialize(): Promise<void> {
    try {
      // Bind event handlers
      this.bindEventHandlers();
      
      // Update UI based on current state
      await this.updateLoginUI();
      
      // Initialize with the current hash
      this.updatePageTitle();
      
      // Listen for hash changes to update the title
      window.addEventListener('hashchange', this.updatePageTitle.bind(this));
      
      // Listen for auth changes
      this.listenForAuthChanges();
      
      loggingService.debug('Top navigation initialized', {}, 'top_nav_controller');
    } catch (error) {
      loggingService.error('Failed to initialize top navigation', error, 'top_nav_controller');
    }
  }
  
  /**
   * Bind event handlers for login and logout buttons
   */
  private bindEventHandlers(): void {
    // Login button click handler
    if (this.loginButton) {
      this.loginButton.addEventListener('click', () => this.handleLoginClick());
    }
    
    // Logout button click handler
    if (this.logoutButton) {
      this.logoutButton.addEventListener('click', () => this.handleLogoutClick());
    }
    
    // Manage subscription button click handler
    if (this.manageSubscriptionButton) {
      this.manageSubscriptionButton.addEventListener('click', () => this.handleManageSubscriptionClick());
    }
    
    // Signup button click handler
    if (this.signupButton) {
      this.signupButton.addEventListener('click', () => this.handleSignupClick());
    }
  }
  
  /**
   * Handle login button click
   */
  private async handleLoginClick(): Promise<void> {
    loggingService.debug('Login button clicked in top nav');
    
    try {
      // Show loading state
      if (this.loginButton) {
        this.loginButton.textContent = 'Logging in...';
        this.loginButton.setAttribute('disabled', 'true');
      }
      
      // Use the background script to start the login process
      const response = await chrome.runtime.sendMessage({
        action: 'auth', 
        authAction: 'login'
      });
      
      // Reset login button state
      if (this.loginButton) {
        this.loginButton.textContent = 'Log In';
        this.loginButton.removeAttribute('disabled');
      }
      
      if (response.success && response.userInfo) {
        loggingService.debug('Login successful', { 
          email: response.userInfo.email,
          subscription: response.userInfo.subscription?.level
        });
        
        // Update the UI
        this.updateLoginUI();
        
        // Show a success notification
        showNotification('Successfully logged in!', 'success');
      } else {
        loggingService.error('Login failed', response.error || 'Unknown error', 'top_nav_controller');
        showNotification('Login failed. Please try again.', 'error');
      }
    } catch (error) {
      loggingService.error('Error during login', error);
      
      // Reset login button state
      if (this.loginButton) {
        this.loginButton.textContent = 'Log In';
        this.loginButton.removeAttribute('disabled');
      }
      
      showNotification('Error logging in. Please try again.', 'error');
    }
  }
  
  /**
   * Handle logout button click
   */
  private async handleLogoutClick(): Promise<void> {
    try {
      loggingService.debug('Logout button clicked in top nav');
      
      // Show loading state
      if (this.logoutButton) {
        this.logoutButton.textContent = 'Logging out...';
        this.logoutButton.setAttribute('disabled', 'true');
      }
      
      // Use the background script to sign out
      const response = await chrome.runtime.sendMessage({
        action: 'auth',
        authAction: 'logout'
      });
      
      // Reset logout button state
      if (this.logoutButton) {
        this.logoutButton.textContent = 'Log Out';
        this.logoutButton.removeAttribute('disabled');
      }
      
      if (response.success) {
        // Update the UI
        this.updateLoginUI();
        showNotification('Successfully logged out', 'success');
        loggingService.debug('Logout successful');
      } else {
        loggingService.error('Logout failed', response.error || 'Unknown error');
        showNotification('Logout failed. Please try again.', 'error');
      }
    } catch (error) {
      loggingService.error('Error during logout', error);
      
      // Reset logout button state
      if (this.logoutButton) {
        this.logoutButton.textContent = 'Log Out';
        this.logoutButton.removeAttribute('disabled');
      }
      
      showNotification('Error logging out. Please try again.', 'error');
    }
  }
  
  /**
   * Update login UI based on authentication state
   */
  private async updateLoginUI(): Promise<void> {
    try {
      // Get auth status from the background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'auth',
        authAction: 'check'
      });
      
      const isLoggedIn = response.isLoggedIn;
      const user = response.currentUser;
      const subscription = response.subscription;
      
      // Show/hide login sections based on auth state
      if (this.loginSection) {
        this.loginSection.style.display = isLoggedIn ? 'none' : 'flex';
      }
      
      if (this.userInfoSection) {
        this.userInfoSection.style.display = isLoggedIn ? 'flex' : 'none';
      }
      
      // Update subscription badge
      if (this.subscriptionBadgeEl) {
        const level = subscription?.level;
        const expiry = subscription?.expiry;
        
        // Determine if user has pro features
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
      }
      
      // Update user email display
      if (this.userEmailEl) {
        if (isLoggedIn && user && user.email) {
          this.userEmailEl.textContent = user.email;
        } else {
          this.userEmailEl.textContent = 'Not signed in';
        }
      }
      
      loggingService.debug('Login UI updated in top nav', { isLoggedIn });
    } catch (error) {
      loggingService.error('Error updating login UI in top nav', error);
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
      // Subscription page removed - handled by website
      case 'help':
        this.pageTitleEl.textContent = 'Help';
        break;
      case 'developer':
        this.pageTitleEl.textContent = 'Developer';
        break;
      default:
        this.pageTitleEl.textContent = 'Six Slides';
    }
  }
  
  /**
   * Handle manage subscription button click
   */
  private handleManageSubscriptionClick(): void {
    loggingService.debug('Manage subscription button clicked');
    // Open the subscription management website in a new tab
    chrome.tabs.create({ url: 'https://6slides.com/subscription' });
  }
  
  /**
   * Handle signup button click
   */
  private handleSignupClick(): void {
    loggingService.debug('Signup button clicked');
    // Open the signup website in a new tab
    chrome.tabs.create({ url: 'https://6slides.com/signup' });
  }

  /**
   * Listen for authentication state changes
   */
  private listenForAuthChanges(): void {
    // Set up message listener for auth events from background
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.action === 'auth_state_changed') {
        loggingService.debug('Auth state changed, updating top nav', {}, 'top_nav_controller');
        this.updateLoginUI();
      }
      return true;
    });
  }
}
