/**
 * Six Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { loggingService } from '../../services/logging_service';
import { PresentationRenderer } from '../../models/renderer';
import { configManager } from '../../models/config_manager';
import { debugService } from '../../services/debug_service';

// Get the web URL from environment variables
const WEB_URL = process.env.WEB_URL || 'https://6slides.com';

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
    
    // Set up the logo link to WEB_URL
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
      const logoLink = document.createElement('a');
      logoLink.href = WEB_URL;
      logoLink.target = '_blank';
      logoLink.rel = 'noopener noreferrer';
      
      // Move the img inside the link
      const logoImg = logoContainer.querySelector('img');
      if (logoImg) {
        logoLink.appendChild(logoImg.cloneNode(true));
        logoContainer.innerHTML = '';
        logoContainer.appendChild(logoLink);
      }
    }
    
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
    
    // Show keyboard shortcut hints for new presentation
    if (!window.location.search.includes('print-pdf') && !sessionStorage.getItem('keyboardHintsShown')) {
      // Create keyboard hints overlay
      const keyboardHints = document.createElement('div');
      keyboardHints.className = 'keyboard-hints';
      keyboardHints.innerHTML = `
        <div class="hints-content">
          <h3>Keyboard Controls</h3>
          <ul>
            <li><span class="key">&rightarrow;</span> / <span class="key">Space</span> Next slide</li>
            <li><span class="key">&leftarrow;</span> Previous slide</li>
            <li><span class="key">&downarrow;</span> Next vertical slide</li>
            <li><span class="key">&uparrow;</span> Previous vertical slide</li>
            <li><span class="key">F</span> Fullscreen</li>
            <li><span class="key">ESC</span> Overview</li>
          </ul>
          <button id="gotItBtn">Got it!</button>
        </div>
      `;
      document.body.appendChild(keyboardHints);
      
      // Add event listener to the Got It button
      document.getElementById('gotItBtn')?.addEventListener('click', () => {
        keyboardHints.classList.add('fade-out');
        setTimeout(() => {
          keyboardHints.remove();
        }, 300);
        // Remember that we've shown the hints for this session
        sessionStorage.setItem('keyboardHintsShown', 'true');
      });
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (document.body.contains(keyboardHints)) {
          keyboardHints.classList.add('fade-out');
          setTimeout(() => {
            if (document.body.contains(keyboardHints)) {
              keyboardHints.remove();
            }
          }, 300);
        }
      }, 15000);
    }
    
    // Check if URL has print-pdf parameter and trigger print automatically
    const isPrintMode = window.location.search.includes('print-pdf');
    if (isPrintMode) {
      loggingService.info('Detected print-pdf in URL, preparing for PDF export', null, 'viewer');
      
      // Create a "Back to Presentation" notice that won't be printed
      const backNotice = document.createElement('div');
      backNotice.className = 'print-back-notice';
      backNotice.innerHTML = `
        <div class="print-notice-content">
          <h3>Print Mode</h3>
          <p>After printing completes or if you cancel, click the button below to return to your presentation.</p>
          <button id="backToPresentationBtn">Back to Presentation</button>
        </div>
      `;
      document.body.appendChild(backNotice);
      
      // Add event listener to the back button
      document.getElementById('backToPresentationBtn')?.addEventListener('click', () => {
        // Remove print-pdf from URL and reload
        const url = new URL(window.location.href);
        url.searchParams.delete('print-pdf');
        window.location.href = url.toString();
      });
      
      // Wait a moment for the page to fully render for printing
      setTimeout(() => {
        window.print();
      }, 1500);
    }
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
