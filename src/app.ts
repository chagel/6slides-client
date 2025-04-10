/**
 * Notion to Slides - Application Bootstrap
 * 
 * Main entry point for the extension that initializes all services and content script functionality
 */

import { getService } from './services/dependency_container';
import { loggingService } from './services/logging_service';
import { errorService, ErrorTypes, ErrorSeverity } from './services/error_service';
import { configManager } from './models/config_manager';
import { debugService } from './services/debug_service';
import { ExtractionResult } from './controllers/content_controller';
import { Slide } from './types/index';
import { getExtensionVersion } from './utils/version';

// Import to register all services
import './services/service_registry';

/**
 * Response structure from extraction process
 */
interface ExtractionResponse {
  slides?: Slide[];
  error?: string;
  stack?: string;
  status?: string;
}

/**
 * Extract content from the current page
 * @returns Promise resolving to array of slide objects
 */
async function extractContent(): Promise<Slide[]> {
  try {
    // Get current URL
    const url = window.location.href;
    
    // Clear storage to ensure we get fresh content each extraction
    // This makes the extension more predictable for users
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('slides');
    }

    // Get the content controller from the dependency container
    const controller = getService('content_controller');
    
    // Use the content controller to extract content based on the page type
    const result = await controller.extractContent(document, url) as ExtractionResult;
    
    if (result.error) {
      return Promise.reject(new Error(result.error));
    }
    
    // Add debug logging to see what was extracted before storage
    loggingService.debug('Extracted slides before storage', result.slides);
    
    return Promise.resolve(result.slides || []);
  } catch (error) {
    loggingService.error('Error in content extraction', error);
    return Promise.reject(error);
  }
}

/**
 * Determine if we're in a service worker context
 * This matches the isServiceWorker check in Storage class
 */
function isServiceWorkerContext(): boolean {
  return typeof window === 'undefined' || 
         !!(typeof globalThis !== 'undefined' && 
            (globalThis as any).ServiceWorkerGlobalScope);
}

/**
 * Set up message handlers for content script functionality
 */
function setupContentScriptHandlers(): void {
  // Only set up message handlers if we're in a content script context (has chrome.runtime)
  // Also verify we're not in a service worker context and have access to onMessage
  if (typeof chrome !== 'undefined' && chrome.runtime && 
      chrome.runtime.onMessage && !isServiceWorkerContext()) {
    // Get messaging service from DI container
    const messagingService = getService('messagingService');
    
    // Add listener for messages from popup/background
    messagingService.addMessageListener((message: {action: string, [key: string]: any}) => {
      loggingService.debug('Content script received message', message);
      
      // Ping action to check if content script is loaded
      if (message.action === 'ping') {
        return { status: 'content_script_ready' };
      }
      
      // Extract content action
      if (message.action === 'extract_content') {
        loggingService.debug('Extracting content from page');
        
        // Return a promise that will be resolved/rejected after extraction
        return new Promise((resolve) => {
          // Use setTimeout to ensure the DOM is fully loaded and accessible
          setTimeout(async () => {
            try {
              const slides = await extractContent();
              
              if (!slides || slides.length === 0) {
                resolve({ 
                  error: 'No slides found. Make sure your page has H1 headings to define slides.' 
                } as ExtractionResponse);
              } else {
                loggingService.debug(`Successfully extracted ${slides.length} slides`);
                resolve({ slides } as ExtractionResponse);
              }
            } catch (error) {
              loggingService.error('Error during extraction', error);
              
              // Create a detailed error response
              resolve({ 
                error: 'Error extracting slides: ' + (error instanceof Error ? error.message : 'Unknown error'),
                stack: error instanceof Error ? error.stack : undefined
              } as ExtractionResponse);
            }
          }, 300); // Short delay to ensure DOM is accessible
        });
      }
      
      // Return undefined for unhandled messages
      return undefined;
    });
    
    loggingService.debug('Content script message handlers set up');
  }
}

/**
 * Initialize the application
 * @returns Promise resolving to initialization success status
 */
export async function initializeApp(): Promise<boolean> {
  try {
    // Add minimal diagnostic logging to help identify context
    console.log('App initialization - Context diagnostics:');
    console.log('- window exists:', typeof window !== 'undefined');
    console.log('- document exists:', typeof document !== 'undefined');
    console.log('- chrome exists:', typeof chrome !== 'undefined');
    if (typeof chrome !== 'undefined') {
      console.log('- chrome.runtime exists:', typeof chrome.runtime !== 'undefined');
    }
    
    // Determine context type for logging and debugging
    const contextType = typeof chrome !== 'undefined' && chrome.runtime ?
      (chrome.runtime.getManifest ? 'background' : 'content_script') : 
      'extension';
    console.log('- contextType:', contextType);
    
    // Get configuration asynchronously
    console.log('Getting settings asynchronously via configManager');
    const config = await configManager.getConfig();
    console.log('Retrieved config from IndexedDB:', config);
    
    // Add detailed debugging about the config
    console.log('FULL CONFIG IN APP.TS: ' + JSON.stringify(config, null, 2));
    
    // Set debug mode through the debug service
    // Handle both boolean and string values for debugLogging
    const debugEnabled = config.debugLogging === true || config.debugLogging === 'true';
    console.log('Debug enabled:', debugEnabled, 'Type:', typeof config.debugLogging, 'Value:', config.debugLogging);
    debugService.setDebugEnabled(debugEnabled);
    
    // Setup content script handlers if appropriate
    setupContentScriptHandlers();
    
    // Get the extension version
    const version = getExtensionVersion();
    
    // Log initialization success
    loggingService.info('Application initialized', {
      version,
      debugMode: config.debugLogging,
      context: contextType
    });
    
    return true;
  } catch (error) {
    // Use the error service for application initialization errors
    errorService.trackError(error instanceof Error ? error : new Error(String(error)), {
      type: ErrorTypes.UNKNOWN,
      severity: ErrorSeverity.CRITICAL,
      context: 'app_bootstrap'
    });
    
    console.error('App initialization failed:', error);
    
    return false;
  }
}

// Initialize the app immediately, without waiting for DOM events
initializeApp().catch(err => {
  console.error('Error initializing app:', err);
});

// Export content script functionality for testing
export { extractContent };
