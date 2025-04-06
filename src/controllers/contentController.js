/**
 * Notion to Slides - Content Controller
 * 
 * Manages content extraction from various sources
 */

import { loggingService } from '../services/LoggingService.js';
import { sourceManager } from '../models/sourceManager.js';
import { contentProcessor } from '../models/contentProcessor.js';
import { storage } from '../models/storage.js';
import { Presentation } from '../models/domain/Presentation.js';
import { errorService, ErrorTypes } from '../services/ErrorService.js';

/**
 * Content Controller class
 * Orchestrates the content extraction process
 */
class ContentController {
  /**
   * Constructor
   */
  constructor() {
    // Nothing to initialize
  }
  
  /**
   * Extract content from a document
   * @param {Document} document - The document to extract from
   * @param {string} url - The page URL
   * @returns {Promise<Object>} - Extraction result with slides or error
   */
  async extractContent(document, url) {
    try {
      loggingService.debug('Extracting content from URL:', url);
      
      // Detect content source
      let sourceType = sourceManager.detectSource(document, url);
      
      if (!sourceType) {
        return {
          error: 'Unsupported content source. Please use a Notion page or Markdown file.',
          sourceType: null
        };
      }
      
      loggingService.debug(`Using extractor for source type: ${sourceType}`);
      
      // Get appropriate extractor
      const extractor = sourceManager.getExtractor(sourceType, document);
      
      // Extract raw content
      const rawSlides = extractor.extract();
      
      if (!rawSlides || rawSlides.length === 0) {
        return {
          error: 'No slides found. Make sure your page has at least one H1 heading.',
          sourceType
        };
      }
      
      // Ensure every slide has the source type
      const slidesWithSourceType = rawSlides.map(slide => ({
        ...slide,
        sourceType: slide.sourceType || sourceType
      }));
      
      // Process content to normalize it
      const processedSlides = contentProcessor.process(slidesWithSourceType);
      
      loggingService.debug(`Extracted and processed ${processedSlides.length} slides`);
      
      // Create a domain presentation model
      const presentation = Presentation.fromSlides(processedSlides, sourceType);
      
      // Store the presentation
      await storage.saveSlides(presentation.toObject().slides);
      
      // Store debug info
      storage.saveDebugInfo({
        timestamp: new Date().toISOString(),
        sourceType,
        url,
        slideCount: presentation.slideCount,
        title: presentation.title
      });
      
      return {
        slides: presentation.toObject().slides,
        presentation,
        sourceType
      };
    } catch (error) {
      // Use the error service to handle the error
      return errorService.handleError(error, {
        type: ErrorTypes.EXTRACTION,
        context: 'content_extraction',
        data: { url, sourceType: 'unknown' }
      });
      
      // The error service already logs and stores the error,
      // so no need to duplicate that logic here
    }
  }
}

// Export a singleton instance
export const contentController = new ContentController();