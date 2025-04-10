/**
 * Notion to Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { loggingService } from '../../services/logging_service';
import { PresentationRenderer } from '../../models/renderer';
import { configManager } from '../../models/config_manager';
import { errorService, ErrorTypes, ErrorSeverity } from '../../services/error_service';
import { debugService } from '../../services/debug_service';

/**
 * Show debug indicator if debug mode is enabled
 * @returns Promise that resolves when debug indicator is set up
 */
async function setupDebugIndicator(): Promise<void> {
  try {
    // Get configuration asynchronously
    const config = await configManager.getConfigAsync();
    const debugEnabled = config.debugLogging === true;
    
    // Configure the debug service
    debugService.setDebugEnabled(debugEnabled);
    
    if (debugEnabled) {
      // Setup the debug indicator with viewer-specific options
      debugService.setupDebugIndicator({
        position: 'bottom-right',
        text: 'DEBUG MODE',
        zIndex: 9999
      });
      
      // Log application info for debugging
      debugService.logAppInfo('viewer', { config });
      
      // Don't enable console logging to keep console clean
    }
  } catch (error) {
    console.error('Error setting up debug indicator:', error);
  }
}

/**
 * Initialize the viewer
 */
// Flag to track initialization in this viewer instance
let viewerInitialized = false;

async function initialize(): Promise<void> {
  // Set document title
  document.title = 'Notion Slides';
  
  // Initialize immediately without waiting for DOM events
  if (viewerInitialized) {
    console.warn('Viewer already initialized, preventing duplicate initialization');
    return;
  }
  
  try {
    // Set flag to prevent double initialization
    viewerInitialized = true;
    
    // Setup debug indicator and enable debug logs if needed
    await setupDebugIndicator();
    
    // Get any renderer settings from the config manager asynchronously
    console.log('Fetching presentation settings...');
    // Use getConfig to get settings, then process them
    const config = await configManager.getConfig();
    const settings = {
      theme: config.theme,
      transition: config.transition,
      slideNumber: config.slideNumber,
      center: config.center
    };
    console.log('Using presentation settings:', settings);
    
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
    // Use error service for consistent error handling
    errorService.trackError(error instanceof Error ? error : new Error(String(error)), {
      type: ErrorTypes.UI,
      context: 'viewer_initialization',
      severity: ErrorSeverity.ERROR
    });
    
    alert('Error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Start initialization based on DOM readiness
if (document.readyState === 'loading') {
  // Document still loading, wait for it to finish
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch(error => {
      console.error('Failed to initialize viewer:', error);
    });
  });
} else {
  // Document already loaded, initialize immediately
  initialize().catch(error => {
    console.error('Failed to initialize viewer:', error);
  });
}