/**
 * Notion to Slides - Service Registry
 * 
 * Registers all services with the dependency container
 */

import { container } from './DependencyContainer.js';
import { storage } from '../models/storage.js';
import { sourceManager } from '../models/sourceManager.js';
import { contentProcessor } from '../models/contentProcessor.js';
import { configManager } from '../models/configManager.js';
import { errorService } from './ErrorService.js';

/**
 * Register all services with the DI container
 */
export function registerServices() {
  // Register core services
  container.register('storage', storage);
  container.register('sourceManager', sourceManager);
  container.register('contentProcessor', contentProcessor);
  container.register('configManager', configManager);
  container.register('errorService', errorService);
  
  // Register factory functions for services that need dependencies or delayed initialization
  container.registerFactory('contentController', (container) => {
    // Import directly rather than dynamically to avoid build issues
    // In the future, we can use dynamic imports with proper bundling configuration
    return {
      // Just expose the functionality we need
      extractContent: async (document, url) => {
        const sourceManager = container.get('sourceManager');
        const contentProcessor = container.get('contentProcessor');
        const storage = container.get('storage');
        const errorService = container.get('errorService');
        
        try {
          // Use sourceManager to get the appropriate extractor
          const sourceType = sourceManager.detectSource(document, url);
          if (!sourceType) {
            return { error: 'Unsupported content source' };
          }
          
          const extractor = sourceManager.getExtractor(sourceType, document);
          const rawSlides = extractor.extract();
          
          if (!rawSlides || rawSlides.length === 0) {
            return { error: 'No slides found' };
          }
          
          const processedSlides = contentProcessor.process(rawSlides);
          await storage.saveSlides(processedSlides);
          
          return { slides: processedSlides, sourceType };
        } catch (error) {
          return errorService.handleError(error, {
            type: 'extraction',
            context: 'content_extraction'
          });
        }
      }
    };
  });
}

// Initialize services
registerServices();