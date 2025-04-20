/**
 * Notion to Slides - Subscription Controller
 * 
 * Handles subscription UI and features in the about page.
 */

import { loggingService } from '../../services/logging_service';
import { configManager, SubscriptionLevel } from '../../models/config_manager';
import { authService } from '../../services/auth_service';

/**
 * Controller for the subscription section
 */
export class SubscriptionController {
  // Subscription elements
  private freeSubscriptionInfo: HTMLElement | null;
  private proSubscriptionInfo: HTMLElement | null;
  private vipSubscriptionInfo: HTMLElement | null;
  private subscriptionExpiry: HTMLElement | null;
  private vipStatus: HTMLElement | null;
  private manageButton: HTMLElement | null;
  private upgradeButton: HTMLElement | null;
  
  // Login elements
  private loginSection: HTMLElement | null;
  private loginButton: HTMLElement | null;
  private logoutButton: HTMLElement | null;
  private userInfoSection: HTMLElement | null;
  private userEmail: HTMLElement | null;
  
  /**
   * Initialize the subscription controller
   */
  constructor() {
    // Subscription elements - now in the about page
    this.freeSubscriptionInfo = document.getElementById('freeSubscriptionInfo');
    this.proSubscriptionInfo = document.getElementById('proSubscriptionInfo');
    this.vipSubscriptionInfo = document.getElementById('vipSubscriptionInfo');
    this.subscriptionExpiry = document.getElementById('subscriptionExpiry');
    this.vipStatus = document.getElementById('vipStatus');
    this.manageButton = document.getElementById('manageSubscription');
    this.upgradeButton = document.getElementById('upgradeProButton');
    
    // Login elements
    this.loginSection = document.getElementById('loginSection');
    this.loginButton = document.getElementById('loginButton');
    this.logoutButton = document.getElementById('logoutButton');
    this.userInfoSection = document.getElementById('userInfoSection');
    this.userEmail = document.getElementById('userEmail');
    
    this.bindEventHandlers();
    this.updateSubscriptionUI();
    this.updateLoginUI();
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Subscription buttons
    if (this.manageButton) {
      this.manageButton.addEventListener('click', this.handleManageClick.bind(this));
    }
    
    if (this.upgradeButton) {
      this.upgradeButton.addEventListener('click', this.handleUpgradeClick.bind(this));
    }
    
    // Login buttons
    if (this.loginButton) {
      loggingService.debug('Login button found, binding click handler');
      // Use an arrow function to preserve this context and add error handling
      this.loginButton.addEventListener('click', () => this.handleLoginClick());
    }
    
    if (this.logoutButton) {
      this.logoutButton.addEventListener('click', () => this.handleLogoutClick());
    }
  }
  
  /**
   * Update the subscription UI based on current subscription status
   */
  async updateSubscriptionUI(): Promise<void> {
    try {
      // Get subscription status from background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'auth',
        authAction: 'check'
      });
      
      const subscription = response.subscription;
      const level = subscription?.level;
      const expiryTimestamp = subscription?.expiry;
      
      // Determine if user has pro or vip features
      const hasPro = (
        (level === 'pro' || level === 'vip') && 
        (expiryTimestamp === null || expiryTimestamp > Date.now())
      );
      
      const isPro = hasPro && level === 'pro';
      const isVip = hasPro && level === 'vip';
      
      // Show/hide appropriate subscription info sections
      if (this.freeSubscriptionInfo) {
        this.freeSubscriptionInfo.style.display = hasPro ? 'none' : 'block';
      }
      
      if (this.proSubscriptionInfo) {
        this.proSubscriptionInfo.style.display = isPro ? 'block' : 'none';
      }
      
      if (this.vipSubscriptionInfo) {
        this.vipSubscriptionInfo.style.display = isVip ? 'block' : 'none';
      }
      
      // Update expiry display if subscribed
      if (hasPro && expiryTimestamp && this.subscriptionExpiry) {
        const expiryDate = new Date(expiryTimestamp);
        this.subscriptionExpiry.textContent = expiryDate.toLocaleDateString();
      } else if (hasPro && this.subscriptionExpiry) {
        this.subscriptionExpiry.textContent = 'Never';
      }
      
      // Update global subscription indicator in sidebar
      this.updateGlobalSubscriptionIndicator(level, hasPro);
      
      // Validate subscription data in background
      chrome.runtime.sendMessage({
        action: 'validate_subscription'
      });
      
      loggingService.debug('Subscription UI updated', { hasPro, level });
    } catch (error) {
      loggingService.error('Error updating subscription UI', error);
    }
  }
  
  /**
   * Update the global subscription indicator in the sidebar
   * @param level - Subscription level
   * @param hasPro - Whether user has pro access
   */
  private updateGlobalSubscriptionIndicator(level: SubscriptionLevel, hasPro: boolean): void {
    // Get subscription indicator elements
    const indicator = document.getElementById('subscription-indicator');
    const badge = document.getElementById('subscription-badge');
    const text = document.getElementById('subscription-text');
    
    // Early return if elements don't exist
    if (!indicator || !badge || !text) return;
    
    // Update indicator class
    indicator.className = 'subscription-indicator';
    badge.className = 'subscription-badge';
    
    // Reset text content
    badge.textContent = '';
    text.textContent = '';
    
    // Update based on subscription level
    if (hasPro) {
      if (level === SubscriptionLevel.PRO) {
        indicator.classList.add('pro');
        badge.classList.add('pro');
        badge.textContent = 'PRO';
        text.textContent = 'Pro Plan';
      } else if (level === SubscriptionLevel.VIP) {
        indicator.classList.add('vip');
        badge.classList.add('vip');
        badge.textContent = 'VIP';
        text.textContent = 'VIP Plan';
      }
    } else {
      indicator.classList.add('free');
      badge.classList.add('free');
      badge.textContent = 'FREE';
      text.textContent = 'Free Plan';
    }
  }
  
  /**
   * Update theme options based on subscription level
   * @param themeSelector - The theme selector element
   */
  async updateThemeOptions(themeSelector: HTMLSelectElement | null): Promise<void> {
    // Early return if theme selector is not available yet
    if (!themeSelector) {
      return;
    }
    
    const hasPro = await configManager.hasPro();
    const premiumThemes = ['catppuccin-latte', 'catppuccin-mocha'];
    const settingRow = themeSelector.closest('.setting-row');
    
    // Get all theme options
    const options = Array.from(themeSelector.options);
    
    // If user doesn't have pro, show premium themes with PRO badge but disable selection
    if (!hasPro) {
      options.forEach(option => {
        if (premiumThemes.includes(option.value)) {
          option.disabled = true;
          if (option.textContent && !option.textContent.includes('(PRO)')) {
            option.textContent += ' (PRO)';
          }
        }
      });
      
      // If a pro theme is currently selected, switch to default
      if (premiumThemes.includes(themeSelector.value)) {
        themeSelector.value = 'default';
      }
      
      // Add a PRO message below the theme selector
      let proMessage = document.getElementById('theme-pro-message');
      if (!proMessage && settingRow) {
        proMessage = document.createElement('div');
        proMessage.id = 'theme-pro-message';
        proMessage.className = 'pro-message';
        proMessage.innerHTML = '<span class="pro-badge">PRO</span> Upgrade to access premium themes';
        proMessage.style.fontSize = '12px';
        proMessage.style.marginTop = '6px';
        proMessage.style.color = '#666';
        settingRow.querySelector('.setting-control')?.appendChild(proMessage);
      }
    } else {
      // Enable all themes for pro users
      options.forEach(option => {
        option.disabled = false;
        if (option.textContent && option.textContent.includes('(PRO)')) {
          option.textContent = option.textContent.replace(' (PRO)', '');
        }
      });
      
      // Remove the PRO message if it exists
      const proMessage = document.getElementById('theme-pro-message');
      if (proMessage && proMessage.parentNode) {
        proMessage.parentNode.removeChild(proMessage);
      }
    }
  }
  
  /**
   * Show pro feature upgrade overlay
   * @param feature - Feature name
   * @param description - Feature description
   */
  showProFeatureOverlay(feature: string, description: string): void {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'pro-overlay';
    
    // Create overlay content
    overlay.innerHTML = `
      <div class="pro-overlay-content">
        <h3>${feature} is a PRO feature</h3>
        <p>${description}</p>
        <button class="pro-overlay-button">Upgrade to Pro</button>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Handle overlay click to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    // Handle upgrade button
    const upgradeButton = overlay.querySelector('.pro-overlay-button');
    if (upgradeButton) {
      upgradeButton.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://6slides.com/subscription' });
        document.body.removeChild(overlay);
      });
    }
  }
  
  /**
   * Handle theme change - check for premium themes
   * @param themeSelector - The theme selector element
   */
  async handleThemeChange(themeSelector: HTMLSelectElement): Promise<void> {
    const hasPro = await configManager.hasPro();
    const premiumThemes = ['catppuccin-latte', 'catppuccin-mocha'];
    const selectedTheme = themeSelector?.value || '';
    
    // If user selects a premium theme without pro, show upsell
    if (!hasPro && premiumThemes.includes(selectedTheme)) {
      this.showProFeatureOverlay('Premium Theme', 'Unlock additional beautiful themes to make your presentations stand out.');
      
      // Reset to default theme
      if (themeSelector) {
        themeSelector.value = 'default';
      }
    }
  }
  
  /**
   * Handle upgrade button click
   */
  private handleUpgradeClick(e: MouseEvent): void {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://6slides.com/subscription' });
  }
  
  /**
   * Handle manage subscription click
   */
  private handleManageClick(): void {
    // Open subscription management page
    chrome.tabs.create({ url: 'https://6slides.com/subscription' });
  }
  
  /**
   * Handle login button click
   */
  private async handleLoginClick(): Promise<void> {
    loggingService.debug('handleLoginClick method called');
    
    try {
      // Show loading state
      if (this.loginButton) {
        this.loginButton.textContent = 'Logging in...';
        this.loginButton.setAttribute('disabled', 'true');
      }
      
      loggingService.debug('Sending auth message to background script');
      
      // Use the background script to start the login process
      const response = await chrome.runtime.sendMessage({
        action: 'auth', 
        authAction: 'login'
      });
      
      loggingService.debug('Received response from background script', response);
      
      // Reset login button state
      if (this.loginButton) {
        this.loginButton.textContent = 'Log In';
        this.loginButton.removeAttribute('disabled');
      }
      
      if (response.success && response.userInfo) {
        const userInfo = response.userInfo;
        
        loggingService.debug('Login successful', { 
          email: userInfo.email,
          subscription: userInfo.subscription?.level
        });
        
        // Update both login and subscription UIs
        this.updateLoginUI();
        this.updateSubscriptionUI();
        
        // Show a notification if the user has a pro subscription
        if (userInfo.subscription?.level?.toLowerCase() === 'pro') {
          this.showSubscriptionActivatedNotification();
        }
      } else {
        loggingService.error('Login failed', response.error || 'Unknown error');
        
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'login-error';
        errorMessage.textContent = 'Login failed. Please try again.';
        errorMessage.style.color = '#e53e3e';
        errorMessage.style.fontSize = '14px';
        errorMessage.style.marginTop = '8px';
        
        // Add to login section
        if (this.loginSection) {
          // Remove any existing error message first
          const existingError = this.loginSection.querySelector('.login-error');
          if (existingError) {
            existingError.remove();
          }
          
          this.loginSection.appendChild(errorMessage);
          
          // Remove the error message after 5 seconds
          setTimeout(() => {
            if (errorMessage.parentNode) {
              errorMessage.parentNode.removeChild(errorMessage);
            }
          }, 5000);
        }
      }
    } catch (error) {
      loggingService.error('Error during login', error);
      
      // Reset login button state
      if (this.loginButton) {
        this.loginButton.textContent = 'Log In';
        this.loginButton.removeAttribute('disabled');
      }
    }
  }
  
  /**
   * Show notification when subscription is activated
   */
  private showSubscriptionActivatedNotification(): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#10B981';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '9999';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '12px';
    notification.style.fontWeight = '500';
    notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 5s forwards';
    
    // Add styles for animation
    const style = document.createElement('style');
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
    
    // Add content
    notification.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Pro subscription successfully activated!</span>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after animation completes
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 5500);
  }
  
  /**
   * Handle logout button click
   */
  private async handleLogoutClick(): Promise<void> {
    try {
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
        this.updateSubscriptionUI();
        
        loggingService.debug('Logout successful');
      } else {
        loggingService.error('Logout failed', response.error || 'Unknown error');
      }
    } catch (error) {
      loggingService.error('Error during logout', error);
      
      // Reset logout button state
      if (this.logoutButton) {
        this.logoutButton.textContent = 'Log Out';
        this.logoutButton.removeAttribute('disabled');
      }
    }
  }
  
  /**
   * Update the login UI based on authentication state
   */
  async updateLoginUI(): Promise<void> {
    try {
      // Get auth status from the background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'auth',
        authAction: 'check'
      });
      
      const isLoggedIn = response.isLoggedIn;
      const user = response.currentUser;
      
      // Show/hide login sections based on auth state
      if (this.loginSection) {
        this.loginSection.style.display = isLoggedIn ? 'none' : 'block';
      }
      
      if (this.userInfoSection) {
        this.userInfoSection.style.display = isLoggedIn ? 'block' : 'none';
      }
      
      // Update user email if logged in
      if (isLoggedIn && user && this.userEmail) {
        this.userEmail.textContent = user.email;
      }
      
      // Show/hide account prompt in free subscription section
      const accountPrompt = document.getElementById('accountPrompt');
      if (accountPrompt) {
        accountPrompt.style.display = isLoggedIn ? 'none' : 'block';
      }
      
      loggingService.debug('Login UI updated', { isLoggedIn });
    } catch (error) {
      loggingService.error('Error updating login UI', error);
    }
  }
}