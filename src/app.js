/**
 * Notion to Slides - Application Bootstrap
 * 
 * Main entry point for the extension that initializes all services
 */

import { getService } from './services/DependencyContainer.js';

// Import to register all services
import './services/serviceRegistry.js';

/**
 * Initialize the application
 */
export async function initializeApp() {
  // Get services from container
  const loggingService = getService('loggingService');
  
  loggingService.debug('Initializing application');
  
  try {
    // Get config manager and load settings
    const configManager = getService('configManager');
    const config = configManager.getConfig();
    
    // Set debug logging based on config
    loggingService.setDebugLogging(config.debugLogging);
    
    loggingService.debug('Application initialized successfully');
    return true;
  } catch (error) {
    loggingService.error('Failed to initialize application', error);
    return false;
  }
}

// Auto-initialize when imported 
initializeApp();