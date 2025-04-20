/**
 * Six Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { loggingService } from '../../services/logging_service';
import { PresentationRenderer } from '../../models/renderer';
import { configManager } from '../../models/config_manager';
import { debugService } from '../../services/debug_service';

/**
 * Show debug indicator if debug mode is enabled
 * @returns Promise that resolves when debug indicator is set up
 */
async function setupDebugIndicator(): Promise<void> {
  try {
    // Get configuration asynchronously
    const config = await configManager.getConfig();
    
    // Setup the debug indicator with viewer-specific options
    // The service now handles everything internally:
    // - Checking if debug is enabled via the config
    // - Configuring logging services
    // - Showing debug indicator if needed
    // - Logging app info
    await debugService.setupDebugIndicator(
      {
        position: 'bottom-right',
        text: 'DEBUG MODE',
        zIndex: 9999
      },
      'viewer',  // Context identifier for logging
      { config } // Additional data for logging
    );
  } catch (_) {
    // Error handled silently - debug indicator is not critical
  }
}

/**
 * Initialize the viewer
 */
// Flag to track initialization in this viewer instance
let viewerInitialized = false;

async function initialize(): Promise<void> {
  // Set document title
  document.title = 'Six Slides';
  
  // Initialize immediately without waiting for DOM events
  if (viewerInitialized) {
    loggingService.warn('Viewer already initialized, preventing duplicate initialization', null, 'viewer');
    return;
  }
  
  try {
    // Set flag to prevent double initialization
    viewerInitialized = true;
    
    // Setup debug indicator and enable debug logs if needed
    await setupDebugIndicator();
    
    // Get any renderer settings from the config manager asynchronously
    const config = await configManager.getConfig();
    const settings = {
      theme: config.theme,
      transition: config.transition,
      slideNumber: config.slideNumber,
      center: config.center
    };
    loggingService.debug('Using presentation settings', settings, 'viewer');
    
    // Create and initialize the renderer
    const renderer = new PresentationRenderer({
      containerId: 'slideContainer',
      ...settings
    });
    
    // Load and render slides
    await renderer.loadAndRender();
    
    // Single log to indicate completion
    loggingService.debug('Viewer ready', null, 'viewer');
  } catch (error) {
    // Log the error
    loggingService.error('Viewer initialization failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      context: 'viewer_initialization'
    });
    
    alert('Error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Start initialization based on DOM readiness
if (document.readyState === 'loading') {
  // Document still loading, wait for it to finish
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch(error => {
      loggingService.error('Failed to initialize viewer', error, 'viewer');
    });
  });
} else {
  // Document already loaded, initialize immediately
  initialize().catch(error => {
    loggingService.error('Failed to initialize viewer', error, 'viewer');
  });
}