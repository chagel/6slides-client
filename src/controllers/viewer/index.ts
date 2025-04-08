/**
 * Notion to Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { loggingService } from '../../services/logging_service';
import { PresentationRenderer } from '../../models/renderer';
import { configManager } from '../../models/config_manager';
import { errorService, ErrorTypes, ErrorSeverity } from '../../services/error_service';

/**
 * Initialize the viewer
 */
function initialize(): void {
  loggingService.debug('Viewer initializing');
  
  // Set document title
  document.title = 'Notion Slides';
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      loggingService.debug('DOM content loaded, creating renderer');
      
      // Get any renderer settings from the config manager
      const settings = configManager.getPresentationSettings();
      
      // Create and initialize the renderer
      const renderer = new PresentationRenderer({
        containerId: 'slideContainer'
      });
      
      // Load and render slides
      await renderer.loadAndRender();
      
      loggingService.debug('Viewer initialization complete');
    } catch (error) {
      // Use error service for consistent error handling
      errorService.trackError(error instanceof Error ? error : new Error(String(error)), {
        type: ErrorTypes.UI,
        context: 'viewer_initialization',
        severity: ErrorSeverity.ERROR
      });
      
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  });
}

// Start initialization
initialize();