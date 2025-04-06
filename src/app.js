/**
 * Notion to Slides - Application Bootstrap
 * 
 * Main entry point for the extension that initializes all services
 */

import { getService } from './services/DependencyContainer.js';
import { loggingService } from './services/LoggingService.js';
import { errorService } from './services/ErrorService.js';

// Import to register all services
import './services/serviceRegistry.js';

/**
 * Initialize the application
 */
export async function initializeApp() {
  // Initialize quietly - only log if debug is enabled later
  // Debug logging is disabled by default at this point
  
  try {
    // Get services from container
    const configManager = getService('configManager');
    
    // Get configuration
    const config = configManager.getConfig();
    
    // Set debug logging and other service configurations based on config
    loggingService.setDebugLogging(config.debugLogging);
    loggingService.setStoreDebugLogs(true); // Always store logs for now
    
    // Set console logging from config or via explicit debug mode setting
    if (config.logConsole !== undefined) {
      loggingService.setConsoleLogging(config.logConsole);
    } else {
      loggingService.setConsoleLogging(config.debugLogging || false);
    }
    
    // Log initialization success
    loggingService.info('Application initialized successfully', {
      version: '1.2.0',
      debugMode: config.debugLogging
    });
    
    return true;
  } catch (error) {
    // Use the error service for application initialization errors
    errorService.trackError(error, {
      type: 'initialization',
      severity: 'critical',
      context: 'app_bootstrap'
    });
    
    return false;
  }
}

// Auto-initialize when imported 
initializeApp();