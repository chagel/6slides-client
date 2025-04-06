/**
 * Notion to Slides - Service Registry
 * 
 * Registers all services with the dependency container
 */

import { container } from './DependencyContainer';
import { storage } from '../models/storage';
import { sourceManager } from '../models/sourceManager';
import { contentProcessor } from '../models/contentProcessor';
import { configManager } from '../models/configManager';
import { errorService, ErrorTypes } from './ErrorService';
import { loggingService, LogLevel } from './LoggingService';

interface LoggingOptions {
  debugEnabled: boolean;
  logLevel: string;
  prefix: string;
  storeDebugLogs: boolean;
  logConsole: boolean;
  maxStoredLogs: number;
}

/**
 * Register all services with the DI container
 */
export function registerServices(): void {
  // Register core services
  container.register('storage', storage);
  container.register('sourceManager', sourceManager);
  container.register('contentProcessor', contentProcessor);
  container.register('configManager', configManager);
  container.register('errorService', errorService);
  container.register('loggingService', loggingService);
  
  // Initialize loggingService (still used as a singleton through direct imports)
  loggingService.initialize({
    debugEnabled: false, // Will be updated from config later
    logLevel: LogLevel.INFO,
    prefix: '[Notion Slides]',
    storeDebugLogs: true,
    logConsole: false, // Disable console logging by default
    maxStoredLogs: 150 // Store more logs for better troubleshooting
  });
  
  // Initialize errorService
  errorService.setTelemetryEnabled(false); // Disable until we have proper telemetry infrastructure
  
  // Register factory functions for services that need dependencies or delayed initialization
  container.registerFactory('contentController', (container) => {
    // Import directly rather than dynamically to avoid build issues
    // In the future, we can use dynamic imports with proper bundling configuration
    return {
      // Just expose the functionality we need
      extractContent: async (document: Document, url: string) => {
        const sourceManager = container.get('sourceManager');
        const contentProcessor = container.get('contentProcessor');
        const storage = container.get('storage');
        const errorService = container.get('errorService');
        const loggingService = container.get('loggingService');
        
        try {
          loggingService.debug('Extracting content', { url });
          
          // Use sourceManager to get the appropriate extractor
          const sourceType = sourceManager.detectSource(document, url);
          if (!sourceType) {
            loggingService.warn('Unsupported content source', { url });
            return { error: 'Unsupported content source' };
          }
          
          const extractor = sourceManager.getExtractor(sourceType, document);
          const rawSlides = extractor.extract();
          
          if (!rawSlides || rawSlides.length === 0) {
            loggingService.warn('No slides found', { url, sourceType });
            return { error: 'No slides found' };
          }
          
          const processedSlides = contentProcessor.process(rawSlides);
          await storage.saveSlides(processedSlides);
          
          loggingService.info('Content extraction successful', { 
            slideCount: processedSlides.length,
            sourceType 
          });
          
          return { slides: processedSlides, sourceType };
        } catch (error) {
          return errorService.handleError(error, {
            type: ErrorTypes.EXTRACTION,
            context: 'content_extraction'
          });
        }
      }
    };
  });
}

// Initialize services
registerServices();