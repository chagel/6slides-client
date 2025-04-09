/**
 * Notion to Slides - Service Registry
 * 
 * Registers all services with the dependency container
 */

import { container } from './dependency_container';
import { storage } from '../models/storage';
import { source_manager } from '../models/source_manager';
import { content_processor } from '../models/content_processor';
import { configManager } from '../models/config_manager';
import { errorService, ErrorTypes } from './error_service';
import { loggingService, LogLevel } from './logging_service';
import { messagingService } from './messaging_service';
import { debugService } from './debug_service';
import { templateService } from './template_service';
import { pageLoader } from './page_loader';

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
  container.register('source_manager', source_manager);
  container.register('content_processor', content_processor);
  container.register('config_manager', configManager);
  container.register('errorService', errorService);
  container.register('loggingService', loggingService);
  container.register('messagingService', messagingService);
  container.register('debugService', debugService);
  container.register('templateService', templateService);
  container.register('pageLoader', pageLoader);
  
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
  container.registerFactory('content_controller', (container) => {
    // Import directly rather than dynamically to avoid build issues
    // In the future, we can use dynamic imports with proper bundling configuration
    return {
      // Just expose the functionality we need
      extractContent: async (document: Document, url: string) => {
        const source_manager = container.get('source_manager');
        const content_processor = container.get('content_processor');
        const storage = container.get('storage');
        const errorService = container.get('errorService');
        const loggingService = container.get('loggingService');
        
        try {
          loggingService.debug('Extracting content', { url });
          
          // Use source_manager to get the appropriate extractor
          const sourceType = source_manager.detectSource(document, url);
          if (!sourceType) {
            loggingService.warn('Unsupported content source', { url });
            return { error: 'Unsupported content source' };
          }
          
          const extractor = source_manager.getExtractor(sourceType, document);
          const rawSlides = extractor.extract();
          
          if (!rawSlides || rawSlides.length === 0) {
            loggingService.warn('No slides found', { url, sourceType });
            return { error: 'No slides found' };
          }
          
          const processedSlides = content_processor.process(rawSlides);
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