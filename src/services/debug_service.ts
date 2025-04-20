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
 * Singleton service for managing debug functionality
 */
class DebugService {
  private _debugIndicator: HTMLElement | null = null;
  private readonly indicatorId = 'debug-mode-indicator';
  
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
   * Log debug mode enabled message with styling
   * @private
   */
  private _logDebugEnabled(): void {
    // Use the logging service instead of direct console logging
    loggingService.debug('Debug mode active');
  }
  
}

// Export a singleton instance
export const debugService = new DebugService();