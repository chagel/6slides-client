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
 */
function setupDebugIndicator(): void {
  // Get configuration
  const config = configManager.getConfig();
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
    
    // Force enable console logging to see logs in the console
    loggingService.setConsoleLogging(true);
  }
}

/**
 * Initialize the viewer
 */
// Flag to track initialization in this viewer instance
let viewerInitialized = false;

function initialize(): void {
  // Set document title
  document.title = 'Notion Slides';
  
  // Initialize when DOM is ready - use once option to prevent multiple triggers
  document.addEventListener('DOMContentLoaded', async () => {
    if (viewerInitialized) {
      console.warn('Viewer already initialized, preventing duplicate initialization');
      return;
    }
    
    try {
      // Set flag to prevent double initialization
      viewerInitialized = true;
      
      // Setup debug indicator and enable debug logs if needed
      setupDebugIndicator();
      
      // Get any renderer settings from the config manager
      const settings = configManager.getPresentationSettings();
      
      // Create and initialize the renderer
      const renderer = new PresentationRenderer({
        containerId: 'slideContainer'
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
  }, { once: true });
}

// Start initialization
initialize();