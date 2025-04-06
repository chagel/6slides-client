/**
 * Notion to Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { logDebug } from '../../common/utils.js';
import { PresentationRenderer } from '../../models/renderer.js';
import { configManager } from '../../models/configManager.js';
import { errorService, ErrorTypes } from '../../services/ErrorService.js';

/**
 * Initialize the viewer
 */
function initialize() {
  logDebug('Viewer initializing');
  
  // Set document title
  document.title = 'Notion Slides';
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      logDebug('DOM content loaded, creating renderer');
      
      // Get any renderer settings from the config manager
      const settings = configManager.getPresentationSettings();
      
      // Create and initialize the renderer
      const renderer = new PresentationRenderer({
        containerId: 'slideContainer',
        ...settings
      });
      
      // Load and render slides
      await renderer.loadAndRender();
      
      logDebug('Viewer initialization complete');
    } catch (error) {
      // Use error service for consistent error handling
      errorService.trackError(error, {
        type: ErrorTypes.UI,
        context: 'viewer_initialization',
        severity: 'error'
      });
      
      alert('Error: ' + (error.message || 'Failed to initialize slides'));
    }
  });
}

// Start initialization
initialize();