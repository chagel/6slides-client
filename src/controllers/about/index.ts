/**
 * Notion to Slides - Main UI Controller
 * 
 * Handles the main UI functionality including about, settings, and pro features
 */

import { loggingService } from '../../services/logging_service';
import { configManager, SubscriptionLevel } from '../../models/config_manager';
import { storage } from '../../models/storage';
import { Settings } from '../../types/storage';

/**
 * MainUIController class to handle all UI logic for the main interface
 * Combines functionality for About, Settings, and Subscription features
 */
class MainUIController {
  // About page elements
  private upgradeButton: HTMLElement | null;
  
  // Settings elements
  private themeSelector: HTMLSelectElement | null;
  private transitionSelector: HTMLSelectElement | null;
  private slideNumberSelector: HTMLSelectElement | null;
  private centerSelector: HTMLSelectElement | null;
  private debugLoggingSelector: HTMLSelectElement | null;
  private saveSettingsBtn: HTMLElement | null;
  private saveStatus: HTMLElement | null;
  private clearCacheBtn: HTMLElement | null;
  
  // Subscription elements
  private freeSubscriptionInfo: HTMLElement | null;
  private proSubscriptionInfo: HTMLElement | null;
  private subscriptionExpiry: HTMLElement | null;
  private manageButton: HTMLElement | null;
  
  /**
   * Constructor for the Main UI controller
   */
  constructor() {
    // About page elements
    this.upgradeButton = document.getElementById('upgradeProButton');
    
    // Settings elements
    this.themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
    this.transitionSelector = document.getElementById('transitionSelector') as HTMLSelectElement;
    this.slideNumberSelector = document.getElementById('slideNumberSelector') as HTMLSelectElement;
    this.centerSelector = document.getElementById('centerSelector') as HTMLSelectElement;
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.saveStatus = document.getElementById('saveStatus');
    this.debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement;
    this.clearCacheBtn = document.getElementById('clearCacheBtn');
    
    // Subscription elements
    this.freeSubscriptionInfo = document.getElementById('freeSubscriptionInfo');
    this.proSubscriptionInfo = document.getElementById('proSubscriptionInfo');
    this.subscriptionExpiry = document.getElementById('subscriptionExpiry');
    this.manageButton = document.getElementById('manageSubscription');
    
    this.bindEventHandlers();
    this.loadSettings();
    this.updateSubscriptionUI();
    
    loggingService.debug('Main UI controller initialized');
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // About page buttons
    if (this.upgradeButton) {
      this.upgradeButton.addEventListener('click', this.handleUpgradeClick.bind(this));
    }
    
    // Settings buttons
    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', this.saveSettings.bind(this));
    }
    
    if (this.debugLoggingSelector) {
      this.debugLoggingSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.clearCacheBtn) {
      this.clearCacheBtn.addEventListener('click', this.clearAllCaches.bind(this));
    }
    
    // Subscription buttons
    if (this.manageButton) {
      this.manageButton.addEventListener('click', this.handleManageClick.bind(this));
    }
    
    // Theme selector (for enforcing pro restrictions)
    if (this.themeSelector) {
      this.themeSelector.addEventListener('change', this.handleThemeChange.bind(this));
    }
  }
  
  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    if (!this.themeSelector) return;
    
    const settings = storage.getSettings();
    
    // Set default values if settings don't exist
    const defaults = {
      theme: 'default',
      transition: 'slide',
      slideNumber: 'false',
      center: 'true',
      debugLogging: 'false'
    };
    
    // Apply settings to selectors
    if (this.themeSelector) this.themeSelector.value = settings.theme?.toString() || defaults.theme;
    if (this.transitionSelector) this.transitionSelector.value = settings.transition?.toString() || defaults.transition;
    if (this.slideNumberSelector) this.slideNumberSelector.value = settings.slideNumber?.toString() || defaults.slideNumber;
    if (this.centerSelector) this.centerSelector.value = settings.center?.toString() || defaults.center;
    
    // Set developer settings
    if (this.debugLoggingSelector) {
      const debugLogging = settings.debugLogging?.toString() || defaults.debugLogging;
      this.debugLoggingSelector.value = debugLogging;
      
      // Apply debug logging setting
      loggingService.setDebugLogging(debugLogging === 'true');
    }
  }
  
  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    if (!this.themeSelector || !this.transitionSelector || 
        !this.slideNumberSelector || !this.centerSelector) {
      return;
    }
    
    const settings: Settings = {
      theme: this.themeSelector.value,
      transition: this.transitionSelector.value,
      slideNumber: this.slideNumberSelector.value,
      center: this.centerSelector.value
    };
    
    // Add developer settings if present
    if (this.debugLoggingSelector) {
      settings.debugLogging = this.debugLoggingSelector.value === 'true';
      
      // Apply debug logging setting immediately
      const debugEnabled = this.debugLoggingSelector.value === 'true';
      loggingService.setDebugLogging(debugEnabled);
      
      // Also enable console logging if debug is enabled
      loggingService.setConsoleLogging(debugEnabled);
    }
    
    await storage.saveSettings(settings);
    loggingService.debug('Settings saved', settings);
    
    // Show feedback
    if (this.saveStatus) {
      this.saveStatus.style.display = 'inline';
      
      // Hide feedback after 2 seconds
      setTimeout(() => {
        if (this.saveStatus) {
          this.saveStatus.style.display = 'none';
        }
      }, 2000);
    }
  }
  
  /**
   * Clear all caches
   */
  private async clearAllCaches(): Promise<void> {
    if (confirm('Are you sure you want to clear all data? This will remove all saved slides and settings.')) {
      try {
        await storage.clearAll();
        alert('All cache data has been cleared successfully.');
        // Reload the page to reflect changes
        window.location.reload();
      } catch (error) {
        alert('Failed to clear cache: ' + (error instanceof Error ? error.message : String(error)));
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
  
  /**
   * Update the subscription UI based on current subscription status
   */
  private updateSubscriptionUI(): void {
    try {
      const hasPro = configManager.hasPro();
      const expiryTimestamp = configManager.getValue('subscriptionExpiry', null);
      
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
      
      // Update theme options
      this.updateThemeOptions();
      
      loggingService.debug('Subscription UI updated', { hasPro });
    } catch (error) {
      loggingService.error('Error updating subscription UI', error);
    }
  }
  
  /**
   * Update theme options based on subscription level
   */
  private updateThemeOptions(): void {
    // Early return if theme selector is not available yet
    if (!this.themeSelector) {
      return;
    }
    
    const hasPro = configManager.hasPro();
    const premiumThemes = ['catppuccin-latte', 'catppuccin-mocha'];
    
    // Get all theme options
    const options = Array.from(this.themeSelector.options);
    
    // If user doesn't have pro, disable premium themes
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
      if (premiumThemes.includes(this.themeSelector.value)) {
        this.themeSelector.value = 'default';
      }
    } else {
      // Enable all themes for pro users
      options.forEach(option => {
        option.disabled = false;
        if (option.textContent && option.textContent.includes('(PRO)')) {
          option.textContent = option.textContent.replace(' (PRO)', '');
        }
      });
    }
  }
  
  /**
   * Handle theme change
   */
  private handleThemeChange(e: Event): void {
    const hasPro = configManager.hasPro();
    const premiumThemes = ['catppuccin-latte', 'catppuccin-mocha'];
    const selectedTheme = this.themeSelector?.value || '';
    
    // If user selects a premium theme without pro, show upsell
    if (!hasPro && premiumThemes.includes(selectedTheme)) {
      this.showProFeatureOverlay('Premium Theme', 'Unlock additional beautiful themes to make your presentations stand out.');
      
      // Reset to default theme
      if (this.themeSelector) {
        this.themeSelector.value = 'default';
      }
    }
  }
  
  /**
   * Show pro feature upgrade overlay
   */
  private showProFeatureOverlay(feature: string, description: string): void {
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
}

/**
 * Initialize the main UI
 */
function initialize(): void {
  loggingService.debug('Main UI initializing');
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Create main UI controller
      const mainController = new MainUIController();
      loggingService.debug('Main UI initialization complete');
    } catch (error) {
      loggingService.error('Error initializing main UI', error);
    }
  });
}

// Start initialization
initialize();