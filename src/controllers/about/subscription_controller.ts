/**
 * Notion to Slides - Subscription Controller
 * 
 * Handles subscription UI and features in the about page.
 */

import { loggingService } from '../../services/logging_service';
import { configManager, SubscriptionLevel } from '../../models/config_manager';

/**
 * Controller for the subscription section
 */
export class SubscriptionController {
  // Subscription elements
  private freeSubscriptionInfo: HTMLElement | null;
  private proSubscriptionInfo: HTMLElement | null;
  private subscriptionExpiry: HTMLElement | null;
  private manageButton: HTMLElement | null;
  private upgradeButton: HTMLElement | null;
  
  /**
   * Initialize the subscription controller
   */
  constructor() {
    // Subscription elements
    this.freeSubscriptionInfo = document.getElementById('freeSubscriptionInfo');
    this.proSubscriptionInfo = document.getElementById('proSubscriptionInfo');
    this.subscriptionExpiry = document.getElementById('subscriptionExpiry');
    this.manageButton = document.getElementById('manageSubscription');
    this.upgradeButton = document.getElementById('upgradeProButton');
    
    this.bindEventHandlers();
    this.updateSubscriptionUI();
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
  }
  
  /**
   * Update the subscription UI based on current subscription status
   */
  async updateSubscriptionUI(): Promise<void> {
    try {
      const hasPro = await configManager.hasPro();
      const { level, expiry: expiryTimestamp } = await configManager.getSubscription();
      
      // Show/hide appropriate subscription info sections
      if (this.freeSubscriptionInfo) {
        this.freeSubscriptionInfo.style.display = hasPro ? 'none' : 'block';
      }
      
      if (this.proSubscriptionInfo) {
        this.proSubscriptionInfo.style.display = hasPro ? 'block' : 'none';
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
    
    // Update based on subscription level
    if (hasPro) {
      if (level === SubscriptionLevel.PRO) {
        indicator.classList.add('pro');
        badge.classList.add('pro');
        badge.textContent = 'PRO';
        text.textContent = 'Pro Plan';
      } else if (level === SubscriptionLevel.TEAM) {
        indicator.classList.add('team');
        badge.classList.add('team');
        badge.textContent = 'TEAM';
        text.textContent = 'Team Plan';
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
        this.handleUpgradeClick(new MouseEvent('click'));
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
    chrome.tabs.create({ url: chrome.runtime.getURL('landing.html#pricing') });
  }
  
  /**
   * Handle manage subscription click
   */
  private handleManageClick(): void {
    // Open subscription management page
    chrome.tabs.create({ url: chrome.runtime.getURL('landing.html#pricing') });
  }
}