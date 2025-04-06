/**
 * Notion to Slides - Content Controller
 * 
 * Manages content extraction from various sources
 */

import { loggingService } from '../services/LoggingService';
import { sourceManager, SourceType } from '../models/sourceManager';
import { contentProcessor } from '../models/contentProcessor';
import { storage } from '../models/storage';
import { Presentation } from '../models/domain/Presentation';
import { errorService, ErrorTypes } from '../services/ErrorService';
import { Slide } from '../types/index';

/**
 * Result of content extraction
 */
export interface ExtractionResult {
  /** Extraction error if any */
  error?: string;
  /** Extracted source type */
  sourceType: SourceType | null;
  /** Extracted slides */
  slides?: Slide[];
  /** Complete presentation */
  presentation?: Presentation;
}

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
   * @param document - The document to extract from
   * @param url - The page URL
   * @returns Extraction result with slides or error
   */
  async extractContent(document: Document, url: string): Promise<ExtractionResult> {
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
      
      // Ensure all slides have required properties
      const validSlides = processedSlides.map(slide => ({
        title: slide.title || 'Untitled Slide',
        content: slide.content || '',
        sourceType: slide.sourceType || sourceType.toString(),
        metadata: slide.metadata
      }));
      
      // Create a domain presentation model
      const presentation = Presentation.fromSlides(validSlides, sourceType.toString());
      
      // Store the presentation
      await storage.saveSlides(presentation.toObject().slides);
      
      // Store debug info
      storage.saveDebugInfo({
        timestamp: new Date().toISOString(),
        sourceType: sourceType.toString(),
        url,
        slideCount: presentation.slideCount,
        title: presentation.title,
        logs: []
      });
      
      return {
        slides: presentation.toObject().slides,
        presentation,
        sourceType
      };
    } catch (error) {
      // Use the error service to handle the error
      const result = await errorService.handleError(error instanceof Error ? error : new Error(String(error)), {
        type: ErrorTypes.EXTRACTION,
        context: 'content_extraction',
        data: { url, sourceType: 'unknown' }
      });
      
      // Add sourceType to the result to make it compatible with ExtractionResult
      return {
        ...result,
        sourceType: null
      };
      
      // The error service already logs and stores the error,
      // so no need to duplicate that logic here
    }
  }
}

// Export a singleton instance
export const contentController = new ContentController();