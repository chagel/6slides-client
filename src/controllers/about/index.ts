/**
 * Notion to Slides - Main UI Controller
 * 
 * Handles the main UI functionality including about, settings, and pro features
 */

import { loggingService } from '../../services/logging_service';
import { configManager, SubscriptionLevel } from '../../models/config_manager';
import { storage } from '../../models/storage';
import { debugService } from '../../services/debug_service';
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
  
  // Log viewer elements
  private logViewerSection: HTMLElement | null;
  private logViewer: HTMLElement | null;
  private refreshLogsBtn: HTMLElement | null;
  private clearLogsBtn: HTMLElement | null;
  private copyLogsBtn: HTMLElement | null;
  private logLevelFilter: HTMLSelectElement | null;
  private logSearchFilter: HTMLInputElement | null;
  private logContextFilter: HTMLSelectElement | null = null;
  
  // Store current filtered logs for copy functionality
  private currentFilteredLogs: any[] = [];
  
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
    
    // Log viewer elements
    this.logViewerSection = document.getElementById('logViewerSection');
    this.logViewer = document.getElementById('logViewer');
    this.refreshLogsBtn = document.getElementById('refreshLogsBtn');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');
    this.copyLogsBtn = document.getElementById('copyLogsBtn');
    this.logLevelFilter = document.getElementById('logLevelFilter') as HTMLSelectElement;
    this.logSearchFilter = document.getElementById('logSearchFilter') as HTMLInputElement;
    
    this.bindEventHandlers();
    this.loadSettings();
    this.updateSubscriptionUI();
    
    // Initialize log viewer if debug mode is enabled
    this.initializeLogViewer();
    
    // Initialize copy button state
    if (this.copyLogsBtn) {
      this.copyLogsBtn.textContent = 'Copy Logs (0)';
      (this.copyLogsBtn as HTMLButtonElement).disabled = true;
    }
    
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
    
    // Log viewer buttons
    if (this.refreshLogsBtn) {
      this.refreshLogsBtn.addEventListener('click', this.refreshLogViewer.bind(this));
    }
    
    if (this.clearLogsBtn) {
      this.clearLogsBtn.addEventListener('click', this.clearLogViewer.bind(this));
    }
    
    if (this.copyLogsBtn) {
      this.copyLogsBtn.addEventListener('click', this.copyLogs.bind(this));
    }
    
    if (this.logLevelFilter) {
      this.logLevelFilter.addEventListener('change', this.filterLogViewer.bind(this));
    }
    
    if (this.logSearchFilter) {
      this.logSearchFilter.addEventListener('input', this.filterLogViewer.bind(this));
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
      const debugEnabled = this.debugLoggingSelector.value === 'true';
      settings.debugLogging = debugEnabled;
      
      // Apply debug logging setting immediately
      loggingService.setDebugLogging(debugEnabled);
      
      // Always enable console logging if debug is enabled
      loggingService.setConsoleLogging(debugEnabled);
      
      // Configure debug service
      debugService.setDebugEnabled(debugEnabled);
      
      // Show log viewer section when debug is enabled
      if (this.logViewerSection) {
        this.logViewerSection.style.display = debugEnabled ? 'block' : 'none';
      }
      
      // Setup visual debug indicator when enabled
      if (debugEnabled) {
        // Create a floating debug indicator with about-specific options
        debugService.setupDebugIndicator({
          position: 'bottom-right', 
          text: 'DEBUG MODE',
          zIndex: 9999
        });
        
        // Log application info for debugging
        debugService.logAppInfo('about', { settingsPage: true });
      }
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
      const level = configManager.getSubscriptionLevel();
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
   */
  private updateThemeOptions(): void {
    // Early return if theme selector is not available yet
    if (!this.themeSelector) {
      return;
    }
    
    const hasPro = configManager.hasPro();
    const premiumThemes = ['catppuccin-latte', 'catppuccin-mocha'];
    const currentValue = this.themeSelector.value;
    const settingRow = this.themeSelector.closest('.setting-row');
    
    // Get all theme options
    const options = Array.from(this.themeSelector.options);
    
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
      if (premiumThemes.includes(this.themeSelector.value)) {
        this.themeSelector.value = 'default';
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
  
  /**
   * Initialize and display the log viewer
   */
  private initializeLogViewer(): void {
    // Only show log viewer section if debug mode is enabled
    const config = configManager.getConfig();
    const debugEnabled = config.debugLogging === true;
    
    if (this.logViewerSection) {
      this.logViewerSection.style.display = debugEnabled ? 'block' : 'none';
    }
    
    // Enable log storage when debug mode is enabled
    if (debugEnabled) {
      loggingService.setStoreDebugLogs(true);
      loggingService.setConsoleLogging(true);
      
      // No need for test logs, we'll let real usage generate logs
    }
    
    // Add context filter dropdown
    this.addContextFilter();
    
    // Load initial logs
    this.refreshLogViewer();
  }

  /**
   * Add context filter dropdown to the log viewer
   */
  private addContextFilter(): void {
    // Find the filter container
    const filterContainer = document.querySelector('.log-filters');
    if (!filterContainer) return;
    
    // Check if context filter already exists
    if (document.getElementById('logContextFilter')) return;
    
    // Create context filter dropdown
    const contextFilterDiv = document.createElement('div');
    contextFilterDiv.className = 'filter-group';
    
    const contextFilterLabel = document.createElement('label');
    contextFilterLabel.htmlFor = 'logContextFilter';
    contextFilterLabel.textContent = 'Context:';
    
    const contextFilter = document.createElement('select');
    contextFilter.id = 'logContextFilter';
    contextFilter.className = 'log-filter';
    
    // Add options
    const contextOptions = [
      { value: 'all', text: 'All Contexts' },
      { value: 'viewer', text: 'Viewer' },
      { value: 'popup', text: 'Popup' },
      { value: 'content_script', text: 'Content Script' },
      { value: 'settings', text: 'Settings' },
      { value: 'about', text: 'About' },
      { value: 'sidebar', text: 'Sidebar' }
    ];
    
    contextOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.text;
      contextFilter.appendChild(optionEl);
    });
    
    // Add event listener
    contextFilter.addEventListener('change', this.filterLogViewer.bind(this));
    
    // Append to filter container
    contextFilterDiv.appendChild(contextFilterLabel);
    contextFilterDiv.appendChild(contextFilter);
    filterContainer.appendChild(contextFilterDiv);
    
    // Store reference
    this.logContextFilter = contextFilter;
  }

  /**
   * Refresh logs from storage (async version)
   */
  private async refreshLogViewer(): Promise<void> {
    if (!this.logViewer) {
      console.error('Log viewer element not found');
      return;
    }
    
    // Show loading indicator
    this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Loading logs...</div>';
    
    try {
      // Get logs from both sources (IndexedDB and localStorage)
      const [idbLogs, localLogs] = await Promise.all([
        storage.getDebugLogs(500), // Increase limit to get more logs
        Promise.resolve(loggingService.getStoredLogs())
      ]);
      
      console.log(`Retrieved ${idbLogs.length} logs from IndexedDB and ${localLogs.length} from localStorage`);
      
      // Combine logs from both sources and deduplicate by hash
      const allLogs = [...idbLogs];
      
      // Add localStorage logs to the combined list
      for (const localLog of localLogs) {
        // Skip logs without essential information
        if (!localLog.timestamp && !localLog.message) {
          continue;
        }
        
        // Add the log to the list, we'll rely on more careful logging rather than deduplication
        allLogs.push(localLog);
      }
      
      if (allLogs.length === 0) {
        this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs available</div>';
        return;
      }
      
      // Sort all logs by timestamp (newest first)
      allLogs.sort((a, b) => {
        const aTime = a.timestamp || a.metadata?.timestamp || '';
        const bTime = b.timestamp || b.metadata?.timestamp || '';
        return bTime.localeCompare(aTime); // Descending order
      });
      
      // Use all logs
      this.filterAndRenderLogs(allLogs);
      
      // Update context filter dropdown with available contexts
      this.updateContextFilter(allLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Error loading logs</div>';
    }
  }
  
  /**
   * Update context filter dropdown with available contexts from logs
   */
  private updateContextFilter(logs: any[]): void {
    if (!this.logContextFilter) return;
    
    // Get unique contexts from logs
    const contexts = new Set<string>();
    
    // Always include default contexts
    contexts.add('all');
    contexts.add('about');
    contexts.add('popup');
    contexts.add('viewer');
    contexts.add('content_script');
    contexts.add('extraction');
    contexts.add('extractor');
    
    // Add contexts from logs
    logs.forEach(log => {
      if (log.metadata && log.metadata.context) {
        contexts.add(log.metadata.context);
      }
    });
    
    // Sort contexts
    const sortedContexts = [...contexts].sort();
    
    // Move 'all' to the front
    sortedContexts.sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return a.localeCompare(b);
    });
    
    // Save current selection
    const currentSelection = this.logContextFilter.value;
    
    // Clear current options
    this.logContextFilter.innerHTML = '';
    
    // Add options
    sortedContexts.forEach(context => {
      if (this.logContextFilter) {  // Add null check
        const option = document.createElement('option');
        option.value = context;
        option.textContent = context === 'all' ? 'All Contexts' : context.charAt(0).toUpperCase() + context.slice(1);
        this.logContextFilter.appendChild(option);
      }
    });
    
    // Restore selection if possible
    if (this.logContextFilter) {
      if (sortedContexts.includes(currentSelection)) {
        this.logContextFilter.value = currentSelection;
      } else {
        this.logContextFilter.value = 'all';
      }
    }
  }
  

  /**
   * Filter and render logs based on current filter settings
   */
  private filterAndRenderLogs(logs: any[]): void {
    if (!this.logViewer || !this.logLevelFilter || !this.logSearchFilter) return;
    
    if (logs.length === 0) {
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs available</div>';
      this.currentFilteredLogs = [];
      return;
    }
    
    // Get filter values
    const levelFilter = this.logLevelFilter.value;
    const searchFilter = this.logSearchFilter.value.toLowerCase();
    const contextFilter = (this.logContextFilter as HTMLSelectElement)?.value || 'all';
    
    // Filter logs
    const filteredLogs = logs.filter(log => {
      // Apply level filter
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchFilter && !log.message.toLowerCase().includes(searchFilter)) {
        return false;
      }
      
      // Apply context filter
      if (contextFilter !== 'all' && (!log.metadata || log.metadata.context !== contextFilter)) {
        return false;
      }
      
      return true;
    });
    
    // Store the filtered logs for copy functionality
    this.currentFilteredLogs = filteredLogs;
    
    // Display filtered logs
    this.renderLogs(filteredLogs);
    
    // Update copy button state
    if (this.copyLogsBtn) {
      this.copyLogsBtn.textContent = `Copy Logs (${filteredLogs.length})`;
      this.copyLogsBtn.style.opacity = filteredLogs.length > 0 ? '1' : '0.5';
      (this.copyLogsBtn as HTMLButtonElement).disabled = filteredLogs.length === 0;
    }
  }
  
  /**
   * Copy filtered logs to clipboard in a nicely formatted way
   */
  private copyLogs(): void {
    if (this.currentFilteredLogs.length === 0) {
      alert('No logs to copy');
      return;
    }
    
    // Get current filter values for header information
    const levelFilter = this.logLevelFilter?.value || 'all';
    const contextFilter = (this.logContextFilter as HTMLSelectElement)?.value || 'all';
    const searchFilter = this.logSearchFilter?.value || '';
    
    // Get browser and extension information
    const browserInfo = navigator.userAgent;
    const extensionVersion = chrome.runtime.getManifest().version;
    
    // Create header with filter information and system details
    const header = `
=== Notion Slides Debug Logs ===
Date: ${new Date().toISOString()}
Extension Version: ${extensionVersion}
Browser: ${browserInfo}

Filters: 
- Level: ${levelFilter.toUpperCase()}
- Context: ${contextFilter.toUpperCase()}
- Search: ${searchFilter ? `"${searchFilter}"` : 'None'}
Total Logs: ${this.currentFilteredLogs.length}

`;
    
    // Format each log entry
    const formattedLogs = this.currentFilteredLogs.map(log => {
      try {
        // Format timestamp with consistent format
        const timestamp = log.timestamp ? 
          new Date(log.timestamp).toISOString() : 
          new Date().toISOString();
        
        // Basic log info
        let logEntry = `[${timestamp}] [${log.level.toUpperCase()}]`;
        
        // Add context if available (with fallbacks)
        const context = log.metadata?.context || 
                       (log.context ? log.context : 'unknown');
        
        logEntry += ` [${context}]`;
        
        // Add message
        logEntry += ` ${log.message}`;
        
        // Add data if available (with better formatting and error handling)
        if (log.data) {
          try {
            const dataStr = typeof log.data === 'object' 
              ? JSON.stringify(log.data, null, 2) 
              : String(log.data);
            
            // Only add if dataStr is not empty
            if (dataStr && dataStr !== '{}' && dataStr !== 'undefined' && dataStr !== 'null') {
              logEntry += `\nData: ${dataStr}`;
            }
          } catch (error) {
            const err = error as Error;
            logEntry += `\nData: [Error formatting data: ${err.message}]`;
          }
        }
        
        // Add error details if available (with improved formatting)
        if (log.errorMessage || (log.error && typeof log.error === 'string')) {
          const errorMsg = log.errorMessage || log.error;
          logEntry += `\nError: ${errorMsg}`;
        }
        
        // Add stack trace if available (with line breaks for readability)
        if (log.stack) {
          // Format the stack trace for better readability
          const formattedStack = log.stack
            .split('\n')
            .map((line: string) => `  ${line.trim()}`)
            .join('\n');
          
          logEntry += `\nStack Trace:\n${formattedStack}`;
        }
        
        // Add log ID if available
        if (log.id) {
          logEntry += `\nID: ${log.id}`;
        }
        
        return logEntry;
      } catch (error) {
        const err = error as Error;
        // Safety fallback for any error in log formatting
        return `[Error formatting log entry: ${err.message}]\nRaw log: ${JSON.stringify(log)}`;
      }
    }).join('\n\n');
    
    // Combine header and logs
    const textToCopy = header + formattedLogs;
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Show success indicator
        if (this.copyLogsBtn) {
          const originalText = `Copy Logs (${this.currentFilteredLogs.length})`;
          const originalBg = getComputedStyle(this.copyLogsBtn).backgroundColor;
          
          // Show success state
          this.copyLogsBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
          `;
          this.copyLogsBtn.style.backgroundColor = '#4caf50';
        
          // Reset button after 2 seconds
          setTimeout(() => {
            if (this.copyLogsBtn) {
              this.copyLogsBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                ${originalText}
              `;
              this.copyLogsBtn.style.backgroundColor = originalBg;
            }
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Error copying logs to clipboard:', err);
        alert('Failed to copy logs to clipboard');
      });
  }

  /**
   * Filter logs based on level, search term, and context
   */
  private filterLogViewer(): void {
    // Get logs directly from storage and filter them
    storage.getDebugLogs(200)
      .then(logs => {
        this.filterAndRenderLogs(logs);
      })
      .catch(error => {
        console.error('Error retrieving logs for filtering:', error);
        // Fall back to localStorage
        const localLogs = loggingService.getStoredLogs();
        this.filterAndRenderLogs(localLogs);
      });
  }

  /**
   * Render logs to the log viewer
   * @param logs - Logs to render
   */
  private renderLogs(logs: any[]): void {
    if (!this.logViewer) return;
    
    if (logs.length === 0) {
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs match the current filters</div>';
      return;
    }
    
    // Clear log viewer
    this.logViewer.innerHTML = '';
    
    // Render each log entry
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      // Format timestamp
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      
      // Create log header
      const logHeader = document.createElement('div');
      logHeader.className = 'log-header';
      
      // Add level indicator
      const levelSpan = document.createElement('span');
      levelSpan.className = `log-level ${log.level}`;
      levelSpan.textContent = log.level.toUpperCase();
      logHeader.appendChild(levelSpan);
      
      // Add context indicator if available
      if (log.metadata && log.metadata.context) {
        const contextSpan = document.createElement('span');
        contextSpan.className = `log-context ${log.metadata.context}`;
        contextSpan.textContent = String(log.metadata.context);
        logHeader.appendChild(contextSpan);
      }
      
      // Add timestamp
      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-timestamp';
      timeSpan.textContent = timestamp;
      logHeader.appendChild(timeSpan);
      
      // Add message
      const messageSpan = document.createElement('span');
      messageSpan.className = 'log-message';
      messageSpan.textContent = log.message;
      logHeader.appendChild(messageSpan);
      
      logEntry.appendChild(logHeader);
      
      // Add data if available
      if (log.data) {
        const logData = document.createElement('div');
        logData.className = 'log-data';
        
        const pre = document.createElement('pre');
        pre.textContent = typeof log.data === 'object' ? 
          JSON.stringify(log.data, null, 2) : 
          String(log.data);
        
        logData.appendChild(pre);
        logEntry.appendChild(logData);
      }
      
      // Add error details if available
      if (log.errorMessage) {
        const errorData = document.createElement('div');
        errorData.className = 'log-data';
        errorData.innerHTML = `<strong>Error:</strong> ${log.errorMessage}`;
        
        if (log.stack) {
          const stackPre = document.createElement('pre');
          stackPre.textContent = log.stack;
          errorData.appendChild(stackPre);
        }
        
        logEntry.appendChild(errorData);
      }
      
      if (this.logViewer) {
        this.logViewer.appendChild(logEntry);
      }
    });
  }

  /**
   * Clear all logs
   */
  private clearLogViewer(): void {
    if (confirm('Are you sure you want to clear all logs?')) {
      // Clear logs without generating test logs
      storage.clearLogs().then(() => {
        loggingService.clearStoredLogs();
        
        // Update UI to show logs were cleared
        if (this.logViewer) {
          this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">All logs have been cleared.</div>';
        }
        
        // Reset filtered logs array
        this.currentFilteredLogs = [];
        
        // Update copy button state
        if (this.copyLogsBtn) {
          this.copyLogsBtn.textContent = 'Copy Logs (0)';
          (this.copyLogsBtn as HTMLButtonElement).disabled = true;
        }
        
        // Create just one single log message about the clearing
        // We intentionally don't create test logs anymore to avoid confusion
        loggingService.info('Logs were cleared by user', null, 'about');
        
        // Refresh the viewer after a short delay
        setTimeout(() => {
          this.refreshLogViewer();
        }, 500);
      }).catch(error => {
        console.error('Error clearing logs:', error);
        alert('Failed to clear logs. Please try again.');
      });
    }
  }
}

// Flag to track initialization in this about page instance
let aboutInitialized = false;

/**
 * Initialize the main UI
 */
function initialize(): void {
  // Initialize when DOM is ready - use once option to prevent multiple triggers
  document.addEventListener('DOMContentLoaded', async () => {
    if (aboutInitialized) {
      console.warn('About page already initialized, preventing duplicate initialization');
      return;
    }
    
    try {
      // Set flag to prevent double initialization
      aboutInitialized = true;
      
      // Create main UI controller
      const mainController = new MainUIController();
      
      // Initialize subscription testing controls
      initSubscriptionTestUI();
    } catch (error) {
      loggingService.error('Error initializing main UI', error);
    }
  }, { once: true });
}

// Class methods are fully defined within the class - these prototype methods are no longer needed

/**
 * Initialize subscription test controls for developer mode
 */
function initSubscriptionTestUI(): void {
  // Get elements
  const setFreeBtn = document.getElementById('setFreeBtn');
  const setProBtn = document.getElementById('setProBtn');
  const setProExpiryBtn = document.getElementById('setProExpiryBtn');
  const setProExpiredBtn = document.getElementById('setProExpiredBtn');
  const setTeamBtn = document.getElementById('setTeamBtn');
  
  // Status elements
  const testSubLevel = document.getElementById('testSubLevel');
  const testHasPro = document.getElementById('testHasPro');
  const testSubExpiry = document.getElementById('testSubExpiry');
  
  // Update the subscription test status display
  function updateSubscriptionTestStatus() {
    // Get subscription status directly from configManager
    const level = configManager.getSubscriptionLevel();
    const hasPro = configManager.hasPro();
    const expiry = configManager.getValue('subscriptionExpiry', null);
    
    // Format expiry date if exists
    const expiryText = expiry 
      ? new Date(expiry).toLocaleDateString() 
      : 'Never';
    
    // Update UI
    if (testSubLevel) testSubLevel.textContent = level.toUpperCase();
    if (testHasPro) testHasPro.textContent = hasPro ? 'YES ✅' : 'NO ❌';
    if (testSubExpiry) testSubExpiry.textContent = expiryText;
  }
  
  // Initialize with current status
  updateSubscriptionTestStatus();
  
  // Setup button event listeners
  if (setFreeBtn) {
    setFreeBtn.addEventListener('click', async () => {
      // Set free subscription
      await configManager.setSubscription(SubscriptionLevel.FREE);
      updateSubscriptionTestStatus();
      window.location.reload(); // Reload to see changes
    });
  }
  
  if (setProBtn) {
    setProBtn.addEventListener('click', async () => {
      // Set pro subscription with no expiry
      await configManager.setSubscription(SubscriptionLevel.PRO, null);
      updateSubscriptionTestStatus();
      window.location.reload(); // Reload to see changes
    });
  }
  
  if (setProExpiryBtn) {
    setProExpiryBtn.addEventListener('click', async () => {
      // Set pro subscription with 30 day expiry
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const expiryDate = Date.now() + thirtyDaysMs;
      await configManager.setSubscription(SubscriptionLevel.PRO, expiryDate);
      updateSubscriptionTestStatus();
      window.location.reload(); // Reload to see changes
    });
  }
  
  if (setProExpiredBtn) {
    setProExpiredBtn.addEventListener('click', async () => {
      // Set pro subscription with expired date
      const yesterdayMs = -24 * 60 * 60 * 1000;
      const expiryDate = Date.now() + yesterdayMs;
      await configManager.setSubscription(SubscriptionLevel.PRO, expiryDate);
      updateSubscriptionTestStatus();
      window.location.reload(); // Reload to see changes
    });
  }
  
  if (setTeamBtn) {
    setTeamBtn.addEventListener('click', async () => {
      // Set team subscription with no expiry
      await configManager.setSubscription(SubscriptionLevel.TEAM, null);
      updateSubscriptionTestStatus();
      window.location.reload(); // Reload to see changes
    });
  }
}

// Start initialization
initialize();