/**
 * Notion to Slides - Debug Service
 * 
 * Centralized debugging utilities to provide consistent debugging functionality
 * across different parts of the application.
 */

import { loggingService } from './logging_service';

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
 * Singleton service for managing debug functionality
 */
class DebugService {
  private _debugEnabled: boolean = false;
  private _debugIndicator: HTMLElement | null = null;
  private readonly indicatorId = 'debug-mode-indicator';
  
  /**
   * Set debug enabled state
   * @param enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled: boolean): void {
    this._debugEnabled = enabled;
    
    // Apply to logging service
    loggingService.setDebugLogging(enabled);
    loggingService.setConsoleLogging(enabled);
    loggingService.setStoreDebugLogs(enabled);
    
    // Log status change
    if (enabled) {
      this._logDebugEnabled();
    } else {
      this._removeDebugIndicator();
      console.log('Debug mode disabled');
    }
  }
  
  /**
   * Check if debug mode is enabled
   * @returns Whether debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this._debugEnabled;
  }
  
  /**
   * Setup debug visual indicator
   * @param options - Optional configuration for the indicator
   * @returns The debug indicator element
   */
  setupDebugIndicator(options: DebugIndicatorOptions = {}): HTMLElement | null {
    // Don't create indicator if debug mode is not enabled
    if (!this._debugEnabled) {
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
    
    // Set basic styles
    indicator.style.position = 'fixed';
    indicator.style.padding = '2px 6px';
    indicator.style.fontSize = '10px';
    indicator.style.fontWeight = 'bold';
    indicator.style.color = 'white';
    indicator.style.backgroundColor = mergedOptions.color;
    indicator.style.borderRadius = '3px';
    indicator.style.zIndex = String(mergedOptions.zIndex);
    indicator.textContent = mergedOptions.text;
    
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
    
    // Append to body
    document.body.appendChild(indicator);
    
    // Store reference
    this._debugIndicator = indicator;
    
    return indicator;
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
   * Log debug mode enabled message with styling
   * @private
   */
  private _logDebugEnabled(): void {
    console.log(
      '%c[DEBUG MODE ACTIVE]', 
      'background: #e91e63; color: white; padding: 4px 8px; font-weight: bold; border-radius: 4px;',
      '\nExtension is running in debug mode.\nCheck console for detailed logs.'
    );
  }
  
  /**
   * Log application information for debugging
   * @param context - Context identifier
   * @param data - Additional data to log
   */
  logAppInfo(context: string, data?: any): void {
    if (!this._debugEnabled) return;
    
    console.group('%c[Notion Slides Debug]', 'background: #3F51B5; color: white; padding: 2px 6px; border-radius: 4px;');
    console.log(`Context: ${context}`);
    console.log(`Version: ${chrome.runtime.getManifest().version}`);
    console.log(`URL: ${window.location.href}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    if (data) {
      console.log('Data:', data);
    }
    
    console.groupEnd();
  }
}

// Export a singleton instance
export const debugService = new DebugService();