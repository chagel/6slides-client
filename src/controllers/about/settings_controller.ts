/**
 * Six Slides - Settings Controller
 * 
 * Handles the settings section of the About page, including theme,
 * transition, and other presentation settings.
 */

import { loggingService } from '../../services/logging_service';
import { storage } from '../../models/storage';
import { configManager } from '../../models/config_manager';

/**
 * Settings Controller for the About page
 */
export class SettingsController {
  // Settings elements
  private themeSelector: HTMLSelectElement | null;
  private transitionSelector: HTMLSelectElement | null;
  private slideNumberSelector: HTMLSelectElement | null;
  private centerSelector: HTMLSelectElement | null;
  private debugLoggingSelector: HTMLSelectElement | null;
  private saveStatus: HTMLElement | null;
  private clearCacheBtn: HTMLElement | null;
  
  // Premium themes that require subscription
  private readonly premiumThemes = [
    'compass', 
    'ignite', 
    'palette', 
    'pulse', 
    'scholar', 
    'summit'
  ];
  
  // Event handlers
  private onSettingChanged: (() => void) | null = null;

  /**
   * Initialize the settings controller
   */
  constructor() {
    this.themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
    this.transitionSelector = document.getElementById('transitionSelector') as HTMLSelectElement;
    this.slideNumberSelector = document.getElementById('slideNumberSelector') as HTMLSelectElement;
    this.centerSelector = document.getElementById('centerSelector') as HTMLSelectElement;
    this.saveStatus = document.getElementById('saveStatus');
    this.debugLoggingSelector = document.getElementById('debugLoggingSelector') as HTMLSelectElement;
    this.clearCacheBtn = document.getElementById('clearCacheBtn');
    
    this.bindEventHandlers();
    
    // Initialize settings asynchronously
    this.initializeAsync();
  }
  
  /**
   * Initialize settings asynchronously
   */
  private async initializeAsync(): Promise<void> {
    try {
      await this.loadSettings();
      // Update theme options based on subscription
      await this.updateThemeOptions();
      loggingService.debug('Settings loaded successfully');
    } catch (error) {
      loggingService.error('Error initializing settings', { error }, 'settings_controller');
    }
  }
  
  /**
   * Set a callback for when settings change
   * @param callback - Function to call when settings change
   */
  setSettingChangedCallback(callback: () => void): void {
    this.onSettingChanged = callback;
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Bind all setting selectors to save automatically on change
    if (this.themeSelector) {
      this.themeSelector.addEventListener('change', async () => {
        await this.handleThemeChange();
        this.saveSettings();
      });
    }
    
    if (this.transitionSelector) {
      this.transitionSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.slideNumberSelector) {
      this.slideNumberSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.centerSelector) {
      this.centerSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.debugLoggingSelector) {
      this.debugLoggingSelector.addEventListener('change', this.saveSettings.bind(this));
    }
    
    if (this.clearCacheBtn) {
      this.clearCacheBtn.addEventListener('click', this.clearAllCaches.bind(this));
    }
  }
  
  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<void> {
    if (!this.themeSelector) return;
    
    try {
      // Get settings asynchronously - storage.getSettings already ensures default values
      const settings = await storage.getSettings();
      loggingService.debug('Settings loaded from IndexedDB', settings);
      
      // Apply settings to selectors - no need for fallback defaults as storage.getSettings handles that
      if (this.themeSelector) this.themeSelector.value = settings.theme?.toString() || '';
      if (this.transitionSelector) this.transitionSelector.value = settings.transition?.toString() || '';
      if (this.slideNumberSelector) this.slideNumberSelector.value = settings.slideNumber?.toString() || '';
      if (this.centerSelector) this.centerSelector.value = settings.center?.toString() || '';
      
      // Set developer settings
      if (this.debugLoggingSelector) {
        const debugLogging = settings.debugLogging?.toString() || 'false';
        loggingService.debug('Debug logging setting', debugLogging);
        this.debugLoggingSelector.value = debugLogging;
        
        // Apply debug logging setting
        loggingService.setDebugLogging(debugLogging === 'true');
      }
    } catch (error) {
      loggingService.error('Error loading settings', { error }, 'settings_controller');
    }
  }
  
  /**
   * Save settings to storage
   */
  async saveSettings(): Promise<void> {
    if (!this.themeSelector || !this.transitionSelector || 
        !this.slideNumberSelector || !this.centerSelector || !this.debugLoggingSelector) {
      return;
    }
    
    loggingService.debug('Auto-saving settings');
    
    // Get existing settings object - this will preserve all existing fields
    const settings = await storage.getSettings();
    
    // Only update the settings fields that are controlled by UI elements
    // This approach preserves all other fields in the settings object
    settings.theme = this.themeSelector.value;
    settings.transition = this.transitionSelector.value;
    settings.slideNumber = this.slideNumberSelector.value;
    settings.center = this.centerSelector.value;
    
    if (this.debugLoggingSelector) {
      const debugEnabledStr = this.debugLoggingSelector.value;
      settings.debugLogging = (debugEnabledStr === 'true');
    }
    
    // Save all settings, which now includes the UI updates plus all pre-existing values
    await storage.saveSettings(settings);
    loggingService.debug('Settings saved', settings);
    
    // Show feedback
    if (this.saveStatus) {
      this.saveStatus.style.display = 'inline';
      this.saveStatus.textContent = 'Settings saved!';
      
      // Hide feedback after 1.5 seconds
      setTimeout(() => {
        if (this.saveStatus) {
          this.saveStatus.style.display = 'none';
        }
      }, 1500);
    }
    
    // Notify parent of settings change
    if (this.onSettingChanged) {
      this.onSettingChanged();
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
   * Handle theme change
   */
  private async handleThemeChange(): Promise<void> {
    const hasPro = await configManager.hasPro();
    const selectedTheme = this.themeSelector?.value || '';
    
    // If user selects a premium theme without pro, show upsell
    if (!hasPro && this.premiumThemes.includes(selectedTheme)) {
      this.showProFeatureOverlay('Premium Theme', 'Unlock additional beautiful themes to make your presentations stand out.');
      
      // Reset to default theme
      if (this.themeSelector) {
        this.themeSelector.value = 'default';
      }
    }
  }

  /**
   * Show pro feature upgrade overlay
   * @param feature - Feature name
   * @param description - Feature description
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
        chrome.tabs.create({ url: 'https://6slides.com/subscription' });
        document.body.removeChild(overlay);
      });
    }
  }

  /**
   * Update theme options based on subscription level
   */
  async updateThemeOptions(): Promise<void> {
    // Early return if theme selector is not available yet
    if (!this.themeSelector) {
      return;
    }
    
    const hasPro = await configManager.hasPro();
    const settingRow = this.themeSelector.closest('.setting-row');
    
    // Get all theme options
    const options = Array.from(this.themeSelector.options);
    
    // If user doesn't have pro, show premium themes with PRO badge but disable selection
    if (!hasPro) {
      options.forEach(option => {
        if (this.premiumThemes.includes(option.value)) {
          option.disabled = true;
          if (option.textContent && !option.textContent.includes('(PRO)')) {
            option.textContent += ' (PRO)';
          }
        }
      });
      
      // If a pro theme is currently selected, switch to default
      if (this.premiumThemes.includes(this.themeSelector.value)) {
        this.themeSelector.value = 'default';
      }
      
      // Add a PRO message below the theme selector
      let proMessage = document.getElementById('theme-pro-message');
      if (!proMessage && settingRow) {
        proMessage = document.createElement('div');
        proMessage.id = 'theme-pro-message';
        proMessage.className = 'pro-message';
        proMessage.innerHTML = '<span class="subscription-badge pro">PRO</span> Upgrade to access premium themes';
        proMessage.style.fontSize = '12px';
        proMessage.style.marginTop = '6px';
        proMessage.style.color = 'var(--text-secondary)';
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
}
