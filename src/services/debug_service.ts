/**
 * Notion to Slides - Debug Service
 * 
 * Centralized debugging utilities to provide consistent debugging functionality
 * across different parts of the application.
 */

import { loggingService } from './logging_service';
import { getExtensionVersion } from '../utils/version';

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
  setDebugEnabled(enabled: boolean | string): void {
    // Handle both boolean and string values
    const isEnabled = enabled === true || enabled === 'true';
    console.log('Debug service - setting debug enabled:', isEnabled, 'Type:', typeof enabled, 'Value:', enabled);
    
    this._debugEnabled = isEnabled;
    
    // Apply to logging service
    loggingService.setDebugLogging(isEnabled);
    // Keep console logging disabled to reduce noise
    loggingService.setConsoleLogging(false);
    loggingService.setStoreDebugLogs(isEnabled);
    
    // Log status change
    if (isEnabled) {
      this._logDebugEnabled();
    } else {
      this._removeDebugIndicator();
      // Don't log to console when debug is disabled
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
    // Use the logging service instead of direct console logging
    loggingService.debug('Debug mode active');
  }
  
  /**
   * Log application information for debugging
   * @param context - Context identifier
   * @param data - Additional data to log
   */
  logAppInfo(context: string, data?: any): void {
    if (!this._debugEnabled) return;
    
    // Gather app info safely
    const appInfo: any = {
      context,
      timestamp: new Date().toISOString()
    };
    
    // Add version using helper function
    try {
      appInfo.version = getExtensionVersion();
    } catch (e) {
      appInfo.version = 'unknown';
    }
    
    // Add URL if window is available
    try {
      if (typeof window !== 'undefined') {
        appInfo.url = window.location.href;
      }
    } catch (e) {
      appInfo.url = 'unknown';
    }
    
    // Add any additional data
    if (data) {
      Object.assign(appInfo, data);
    }
    
    // Log using the logging service
    loggingService.debug('Application info', appInfo);
  }
}

// Export a singleton instance
export const debugService = new DebugService();