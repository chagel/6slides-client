/**
 * Notion to Slides - Application Bootstrap
 * 
 * Main entry point for the extension that initializes all services and content script functionality
 */

import { getService } from './services/dependency_container';
import { loggingService } from './services/logging_service';
import { errorService, ErrorTypes, ErrorSeverity } from './services/error_service';
import { config_manager } from './models/config_manager';
import { ExtractionResult } from './controllers/content_controller';
import { Slide } from './types/index';

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
    loggingService.debug('EXTRACTED SLIDES BEFORE STORAGE:');
    loggingService.debug('Slides', result.slides);
    
    return Promise.resolve(result.slides || []);
  } catch (error) {
    loggingService.error('Error in content extraction', error);
    return Promise.reject(error);
  }
}

/**
 * Set up message handlers for content script functionality
 */
function setupContentScriptHandlers(): void {
  // Only set up message handlers if we're in a content script context (has chrome.runtime)
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Get messaging service from DI container
    const messagingService = getService('messagingService');
    
    // Add listener for messages from popup/background
    messagingService.addMessageListener((message: {action: string, [key: string]: any}, sender: chrome.runtime.MessageSender) => {
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
    // Get configuration
    const config = config_manager.getConfig();
    
    // Set debug logging and other service configurations based on config
    loggingService.setDebugLogging(config.debugLogging || false);
    loggingService.setStoreDebugLogs(true); // Always store logs for now
    
    // Set console logging from config or via explicit debug mode setting
    if (config.logConsole !== undefined) {
      loggingService.setConsoleLogging(config.logConsole);
    } else {
      loggingService.setConsoleLogging(config.debugLogging || false);
    }
    
    // Set up content script message handlers if we're in that context
    setupContentScriptHandlers();
    
    // Log initialization success
    loggingService.info('Application initialized successfully', {
      version: '1.4.0',
      debugMode: config.debugLogging,
      context: typeof chrome !== 'undefined' && chrome.runtime ? 'content_script' : 'extension'
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

// Auto-initialize when imported 
initializeApp();

// Export content script functionality for testing
export { extractContent };