/**
 * Notion to Slides - Content Controller
 * 
 * Manages content extraction from various sources
 */

import { logDebug, logError } from '../common/utils.js';
import { sourceManager } from '../models/sourceManager.js';
import { storage } from '../models/storage.js';

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
      logDebug('Extracting content from URL:', url);
      
      // Detect content source
      const sourceType = sourceManager.detectSource(document, url);
      
      if (!sourceType) {
        return {
          error: 'Unsupported content source. Please use a Notion page or Markdown file.',
          sourceType: null
        };
      }
      
      logDebug(`Using extractor for source type: ${sourceType}`);
      
      // Get appropriate extractor
      const extractor = sourceManager.getExtractor(sourceType, document);
      
      // Extract content
      let slides = extractor.extract();
      
      if (!slides || slides.length === 0) {
        return {
          error: 'No slides found. Make sure your page has at least one H1 heading.',
          sourceType
        };
      }
      
      // Ensure every slide has the source type
      slides = slides.map(slide => ({
        ...slide,
        sourceType: slide.sourceType || sourceType
      }));
      
      logDebug(`Extracted ${slides.length} slides`);
      
      // Store slides
      await storage.saveSlides(slides);
      
      // Store debug info
      storage.saveDebugInfo({
        timestamp: new Date().toISOString(),
        sourceType,
        url,
        slideCount: slides.length
      });
      
      return {
        slides,
        sourceType
      };
    } catch (error) {
      logError('Error extracting content', error);
      
      // Store error info for debugging
      storage.saveErrorInfo({
        error: error.message,
        stack: error.stack
      });
      
      return {
        error: `Error extracting content: ${error.message}`,
        stack: error.stack
      };
    }
  }
}

// Export a singleton instance
export const contentController = new ContentController();