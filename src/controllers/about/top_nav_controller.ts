/**
 * Notion to Slides - Top Navigation Controller
 * 
 * Handles the top navigation functionality including user info and subscription status
 */

import { loggingService } from '../../services/logging_service';

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
        this.showNotification('Successfully logged in!', 'success');
      } else {
        loggingService.error('Login failed', response.error || 'Unknown error');
        this.showNotification('Login failed. Please try again.', 'error');
      }
    } catch (error) {
      loggingService.error('Error during login', error);
      
      // Reset login button state
      if (this.loginButton) {
        this.loginButton.textContent = 'Log In';
        this.loginButton.removeAttribute('disabled');
      }
      
      this.showNotification('Error logging in. Please try again.', 'error');
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
        this.showNotification('Successfully logged out', 'success');
        loggingService.debug('Logout successful');
      } else {
        loggingService.error('Logout failed', response.error || 'Unknown error');
        this.showNotification('Logout failed. Please try again.', 'error');
      }
    } catch (error) {
      loggingService.error('Error during logout', error);
      
      // Reset logout button state
      if (this.logoutButton) {
        this.logoutButton.textContent = 'Log Out';
        this.logoutButton.removeAttribute('disabled');
      }
      
      this.showNotification('Error logging out. Please try again.', 'error');
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
        this.pageTitleEl.textContent = 'Notion to Slides';
    }
  }
  
  /**
   * Display a notification to the user
   * @param message The message to display
   * @param type The type of notification (success, error, etc)
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '9999';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '12px';
    notification.style.fontWeight = '500';
    notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 5s forwards';
    
    // Set color based on type
    if (type === 'success') {
      notification.style.backgroundColor = '#10B981';
      notification.style.color = 'white';
    } else if (type === 'error') {
      notification.style.backgroundColor = '#EF4444';
      notification.style.color = 'white';
    } else {
      notification.style.backgroundColor = '#3B82F6';
      notification.style.color = 'white';
    }
    
    // Add styles for animation if they don't exist
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add content
    notification.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
        ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' : 
         type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' :
         '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
      </svg>
      <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5500);
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