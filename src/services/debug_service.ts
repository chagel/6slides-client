/**
 * Notion to Slides - Debug Service
 * 
 * Centralized debugging utilities to provide consistent debugging functionality
 * across different parts of the application.
 */

import { loggingService } from './logging_service';
import { getExtensionVersion } from '../utils/version';
import { storage } from '../models/storage';

/**
 * Debug indicator options
 */
interface DebugIndicatorOptions {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: string;
  text?: string;
  zIndex?: number;
}

/**
 * Debug sidebar options
 */
interface DebugSidebarOptions {
  width?: string;
  background?: string;
  zIndex?: number;
}

/**
 * Singleton service for managing debug functionality
 */
class DebugService {
  private _debugIndicator: HTMLElement | null = null;
  private _debugSidebar: HTMLElement | null = null;
  private readonly indicatorId = 'debug-mode-indicator';
  private readonly sidebarId = 'debug-logs-sidebar';
  private _sidebarVisible = false;
  
  /**
   * Check if debug mode is enabled
   * @returns Whether debug mode is enabled
   */
  async isDebugEnabled(): Promise<boolean> {
    const settings = await storage.getSettings();
    return settings.debugLogging === true;
  }
  
  /**
   * Setup debug visual indicator
   * @param options - Optional configuration for the indicator
   * @param context - Optional context identifier for logging
   * @param data - Additional data to log
   * @returns The debug indicator element
   */
  async setupDebugIndicator(
    options: DebugIndicatorOptions = {}, 
    context: string = '', 
    data?: any
  ): Promise<HTMLElement | null> {
    // Get debug state from settings
    const settings = await storage.getSettings();
    const isDebugEnabled = settings.debugLogging === true;
    
    // Remove existing debug UI elements
    this._removeDebugIndicator();
    this._removeDebugSidebar();
    
    // Don't create indicator if debug mode is not enabled
    if (!isDebugEnabled) {
      return null;
    }
    
    // Remove existing indicator if any
    this._removeDebugIndicator();
    
    // Default options
    const defaultOptions: Required<DebugIndicatorOptions> = {
      position: 'top-right',
      color: '#e91e63',
      text: 'DEBUG',
      zIndex: 9999
    };
    
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.id = this.indicatorId;
    
    // Set basic styles without !important
    indicator.style.position = 'fixed';
    indicator.style.padding = '2px 6px';
    indicator.style.fontSize = '10px';
    indicator.style.fontWeight = 'bold';
    indicator.style.color = 'white';
    indicator.style.backgroundColor = mergedOptions.color;
    indicator.style.borderRadius = '3px';
    indicator.style.zIndex = String(mergedOptions.zIndex);
    indicator.style.lineHeight = '15px';
    indicator.style.fontFamily = '-apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    
    // Create indicator with expand/collapse icon
    const statusIcon = document.createElement('span');
    statusIcon.id = 'debug-indicator-icon';
    statusIcon.innerHTML = ' &#9658;'; // Default (collapsed) state with space before
    statusIcon.style.fontSize = '8px';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = mergedOptions.text;
    
    indicator.appendChild(textSpan);
    indicator.appendChild(statusIcon);
    
    // Set position
    switch(mergedOptions.position) {
      case 'top-right':
        indicator.style.top = '0';
        indicator.style.right = '0';
        indicator.style.borderRadius = '0 0 0 4px';
        break;
      case 'top-left':
        indicator.style.top = '0';
        indicator.style.left = '0';
        indicator.style.borderRadius = '0 0 4px 0';
        break;
      case 'bottom-right':
        indicator.style.bottom = '0';
        indicator.style.right = '0';
        indicator.style.borderRadius = '4px 0 0 0';
        break;
      case 'bottom-left':
        indicator.style.bottom = '0';
        indicator.style.left = '0';
        indicator.style.borderRadius = '0 4px 0 0';
        break;
    }
    
    // Add click handler to toggle the debug sidebar
    indicator.style.cursor = 'pointer';
    indicator.title = 'Click to show/hide debug logs';
    indicator.addEventListener('click', this._toggleDebugSidebar.bind(this));
    
    // Append to body
    document.body.appendChild(indicator);
    
    // Store reference
    this._debugIndicator = indicator;
    
    // Configure logging services
    loggingService.setDebugLogging(isDebugEnabled);
    
    // Log status change
    if (isDebugEnabled) {
      this._logDebugEnabled();
      
      // Log app info if context is provided
      if (context) {
        // Add settings to the data if not provided
        const appData = data || {};
        if (!appData.settings) {
          appData.settings = settings;
        }
        
        // Log app info with context and data
        this._logApplicationInfo(context, appData);
      }
    }
    
    return indicator;
  }
  
  /**
   * Log application information internally
   * @private
   * @param context - Context identifier
   * @param data - Additional data to log
   */
  private _logApplicationInfo(context: string, data?: any): void {
    // Gather app info safely
    const appInfo: any = {
      context,
      timestamp: new Date().toISOString()
    };
    
    // Add version using helper function
    try {
      appInfo.version = getExtensionVersion();
    } catch (_) {
      appInfo.version = 'unknown';
    }
    
    // Add URL if window is available
    try {
      if (typeof window !== 'undefined') {
        appInfo.url = window.location.href;
      }
    } catch (_) {
      appInfo.url = 'unknown';
    }
    
    // Add any additional data
    if (data) {
      Object.assign(appInfo, data);
    }
    
    // Log using the logging service
    loggingService.debug('Application info', appInfo);
  }
  
  /**
   * Remove debug indicator if it exists
   * @private
   */
  private _removeDebugIndicator(): void {
    const existingIndicator = document.getElementById(this.indicatorId);
    if (existingIndicator && existingIndicator.parentNode) {
      existingIndicator.parentNode.removeChild(existingIndicator);
    }
    this._debugIndicator = null;
  }
  
  /**
   * Toggle the debug sidebar visibility
   * @private
   */
  private async _toggleDebugSidebar(): Promise<void> {
    this._sidebarVisible = !this._sidebarVisible;
    
    // Update indicator icon based on sidebar visibility using HTML entities
    const statusIcon = document.getElementById('debug-indicator-icon');
    if (statusIcon) {
      statusIcon.innerHTML = this._sidebarVisible ? ' &#9650;' : ' &#9658;'; // Up or right arrow
    }
    
    if (this._sidebarVisible) {
      await this._showDebugSidebar();
    } else {
      this._hideDebugSidebar();
    }
  }
  
  /**
   * Create and show the debug sidebar
   * @private
   */
  private async _showDebugSidebar(): Promise<void> {
    // Remove existing sidebar if any
    this._removeDebugSidebar();
    
    // Default options
    const defaultOptions: Required<DebugSidebarOptions> = {
      width: '400px',
      background: '#f8f8f8',
      zIndex: 9998 // One less than the indicator
    };
    
    // Create a simple sidebar
    const sidebar = document.createElement('div');
    sidebar.id = this.sidebarId;
    
    // Minimal styling
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: ${defaultOptions.width};
      max-width: 90vw;
      background-color: white;
      z-index: ${defaultOptions.zIndex};
      box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
      font-family: monospace;
      font-size: 12px;
      overflow-y: scroll;
    `;
    
    // Simple header with just the title
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      padding: 10px;
      background-color: #f0f0f0;
      border-bottom: 1px solid #ddd;
      position: sticky;
      top: 0;
      z-index: 1;
    `;
    
    // Title with log count, refresh button, clear button, report button, and close button
    titleBar.innerHTML = '<b>Debug Logs</b> <span id="debug-log-count"></span> <span style="margin-left:15px;cursor:pointer;font-size:11px;" id="debug-refresh">[Refresh]</span> <span style="margin-left:8px;cursor:pointer;font-size:11px;" id="debug-clear">[Clear]</span> <span style="margin-left:8px;cursor:pointer;font-size:11px;" id="debug-report">[Report]</span> <span style="float:right;cursor:pointer" id="debug-close">x</span>';
    
    // Simple logs container - just a div
    const logsContainer = document.createElement('div');
    logsContainer.id = 'debug-logs-container';
    
    // Add components to sidebar
    sidebar.appendChild(titleBar);
    sidebar.appendChild(logsContainer);
    
    // Append to body
    document.body.appendChild(sidebar);
    
    // Add close button handler
    const closeButton = document.getElementById('debug-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this._toggleDebugSidebar());
    }
    
    // Add refresh button handler
    const refreshButton = document.getElementById('debug-refresh');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this._updateDebugSidebar();
      });
    }
    
    // Add clear button handler
    const clearButton = document.getElementById('debug-clear');
    if (clearButton) {
      clearButton.addEventListener('click', async () => {
        await loggingService.clearLogs();
        this._updateDebugSidebar();
      });
    }
    
    // Add report button handler
    const reportButton = document.getElementById('debug-report');
    if (reportButton) {
      reportButton.addEventListener('click', async () => {
        this._sendDebugReport();
      });
    }
    
    // Add ESC key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._sidebarVisible) {
        this._toggleDebugSidebar();
      }
    });
    
    // Store reference
    this._debugSidebar = sidebar;
    
    // Load and display logs
    await this._updateDebugSidebar();
  }
  
  /**
   * Hide the debug sidebar
   * @private
   */
  private _hideDebugSidebar(): void {
    if (!this._debugSidebar) return;
    
    this._removeDebugSidebar();
  }
  
  /**
   * Remove the debug sidebar from the DOM
   * @private
   */
  private _removeDebugSidebar(): void {
    const existingSidebar = document.getElementById(this.sidebarId);
    if (existingSidebar && existingSidebar.parentNode) {
      existingSidebar.parentNode.removeChild(existingSidebar);
    }
    this._debugSidebar = null;
  }
  
  /**
   * Update the debug sidebar with the latest logs
   * @private
   */
  private async _updateDebugSidebar(): Promise<void> {
    if (!this._debugSidebar) return;
    
    // Get all logs sorted by timestamp (newest first) - no limit to see everything
    const logs = await loggingService.getLogs();
    
    // Get the logs container by ID
    const logsContainer = document.getElementById('debug-logs-container');
    if (!logsContainer) return;
    
    // Update log count
    const countDisplay = document.getElementById('debug-log-count');
    if (countDisplay) {
      countDisplay.textContent = `(${logs.length})`;
    }
    
    // Clear existing logs
    logsContainer.innerHTML = '';
    
    if (logs.length === 0) {
      logsContainer.innerHTML = `
        <div style="padding: 16px; color: #666; text-align: center;">
          No logs available.
        </div>
      `;
      return;
    }
    
    // Add each log entry
    const fragment = document.createDocumentFragment();
    
    logs.forEach((log, index) => {
      const logElement = document.createElement('div');
      const logIndex = logs.length - index;
      
      // Set basic styles for the log entry
      logElement.style.cssText = `
        margin: 10px;
        padding: 8px 8px 8px 32px;
        border-radius: 4px;
        border-left: 4px solid #ddd;
        position: relative;
        background-color: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      `;
      
      // Set color based on log level
      switch (log.level) {
        case 'debug':
          logElement.style.borderLeftColor = '#8BC34A';
          logElement.style.backgroundColor = '#F1F8E9';
          break;
        case 'info':
          logElement.style.borderLeftColor = '#2196F3';
          logElement.style.backgroundColor = '#E3F2FD';
          break;
        case 'warn':
          logElement.style.borderLeftColor = '#FFC107';
          logElement.style.backgroundColor = '#FFF8E1';
          break;
        case 'error':
          logElement.style.borderLeftColor = '#F44336';
          logElement.style.backgroundColor = '#FFEBEE';
          break;
      }
      
      // Add index number
      const indexNumber = document.createElement('div');
      indexNumber.textContent = String(logIndex);
      indexNumber.style.cssText = `
        position: absolute;
        left: 8px;
        top: 8px;
        font-size: 10px;
        color: #666;
        font-weight: bold;
      `;
      logElement.appendChild(indexNumber);
      
      // Add header with level, context, and timestamp
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      `;
      
      const levelAndContext = document.createElement('span');
      levelAndContext.style.cssText = `
        font-weight: bold;
        text-transform: uppercase;
      `;
      
      const context = log.metadata?.context || '';
      levelAndContext.textContent = `[${log.level}]${context ? ' [' + context + ']' : ''}`;
      
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const time = document.createElement('span');
      time.style.color = '#666';
      time.textContent = timestamp;
      
      header.appendChild(levelAndContext);
      header.appendChild(time);
      logElement.appendChild(header);
      
      // Add message
      const message = document.createElement('div');
      message.style.marginBottom = '6px';
      message.textContent = log.message;
      logElement.appendChild(message);
      
      // Variables to store data and error elements
      let dataElement = null;
      let errorElement = null;
      
      // Add data if available
      if (log.data) {
        dataElement = document.createElement('pre');
        dataElement.style.cssText = `
          padding: 8px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          margin-top: 8px;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: monospace;
          font-size: 11px;
          display: none;
        `;
        
        try {
          dataElement.textContent = JSON.stringify(log.data, null, 2);
        } catch (e) {
          dataElement.textContent = String(log.data);
        }
        
        logElement.appendChild(dataElement);
      }
      
      // Add error details if available
      if (log.errorMessage || log.stack) {
        errorElement = document.createElement('pre');
        errorElement.style.cssText = `
          padding: 8px;
          background-color: rgba(244, 67, 54, 0.1);
          border-radius: 4px;
          margin-top: 8px;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: monospace;
          font-size: 11px;
          display: none;
        `;
        
        errorElement.textContent = log.errorMessage ? `${log.errorMessage}\n` : '';
        if (log.stack) {
          errorElement.textContent += log.stack;
        }
        
        logElement.appendChild(errorElement);
      }
      
      // Add click handler for expandable elements
      if (dataElement || errorElement) {
        logElement.style.cursor = 'pointer';
        logElement.title = 'Click to show/hide details';
        
        logElement.addEventListener('click', function() {
          // Toggle data and error sections
          if (dataElement) {
            dataElement.style.display = dataElement.style.display === 'none' ? 'block' : 'none';
          }
          if (errorElement) {
            errorElement.style.display = errorElement.style.display === 'none' ? 'block' : 'none';
          }
        });
      }
      
      // Add the log entry to the document fragment
      fragment.appendChild(logElement);
    });
    
    // Add all log entries to the container at once
    logsContainer.appendChild(fragment);
  }
  
  /**
   * Log debug mode enabled message with styling
   * @private
   */
  private _logDebugEnabled(): void {
    // Use the logging service instead of direct console logging
    loggingService.debug('Debug mode active');
  }
  
  /**
   * Send debug report via email with downloadable log file
   * @private
   */
  private async _sendDebugReport(): Promise<void> {
    // Show confirmation dialog
    const confirmed = confirm(
      "You can report to us if you have found a bug. This will download a debug report file and open your email client.\n\n" +
      "Please attach the downloaded file to the email before sending it to Six Slides support.\n\n" +
      "Would you like to continue?"
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    try {
      // Get all logs
      const logs = await loggingService.getLogs();
      
      // Get user settings
      const settings = await storage.getSettings();
      
      // Collect system information
      const systemInfo = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        version: getExtensionVersion(),
        settings: settings
      };
      
      // Create a complete report object
      const report = {
        systemInfo,
        logs
      };
      
      // Convert to JSON string
      const reportJson = JSON.stringify(report, null, 2);
      
      // Create a blob with the data
      const blob = new Blob([reportJson], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sixslides-debug-report-${timestamp}.json`;
      
      // Create download link element
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      
      // Trigger download
      downloadLink.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Show notification that file was downloaded
      alert(
        `Debug report file has been downloaded: ${filename}\n\n` +
        "Your email client will open next. Please attach this file to your email before sending."
      );
      
      // Also open email with instructions
      const subject = encodeURIComponent(`Six Slides Debug Report - ${new Date().toLocaleString()}`);
      const body = encodeURIComponent(
        `Debug Report\n\n` +
        `IMPORTANT: Please attach the debug report file (${filename}) that was just downloaded.\n\n` +
        `Browser: ${navigator.userAgent}\n` +
        `URL: ${window.location.href}\n` +
        `Version: ${getExtensionVersion()}\n\n` +
        `Please describe the issue you're experiencing:\n`
      );
      
      // Open email client after a short delay to ensure download starts first
      setTimeout(() => {
        const mailtoLink = `mailto:support@6slides.com?subject=${subject}&body=${body}`;
        window.open(mailtoLink);
      }, 500); // Increased delay to allow user to read the alert
    } catch (error) {
      console.error('Failed to create debug report:', error);
      alert('Failed to create debug report. Please try again.');
    }
  }
  
}

// Export a singleton instance
export const debugService = new DebugService();
