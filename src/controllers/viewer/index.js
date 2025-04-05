/**
 * Notion to Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { logDebug, logError } from '../../common/utils.js';
import { PresentationRenderer } from '../../models/renderer.js';

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
      
      // Create and initialize the renderer
      const renderer = new PresentationRenderer({
        containerId: 'slideContainer'
      });
      
      // Load and render slides
      await renderer.loadAndRender();
      
      logDebug('Viewer initialization complete');
    } catch (error) {
      logError('Error initializing viewer', error);
      alert('Error: ' + (error.message || 'Failed to initialize slides'));
    }
  });
}

// Start initialization
initialize();