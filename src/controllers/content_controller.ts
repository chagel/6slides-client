/**
 * Six Slides - Content Controller
 * 
 * Manages content extraction from various sources
 */

import { source_manager, SourceType } from '../models/source_manager';
import { content_processor } from '../models/content_processor';
import { storage } from '../models/storage';
import { Presentation } from '../models/domain/presentation';
import { loggingService } from '../services/logging_service';
import { Slide } from '../types/index';
import { configManager } from '../models/config_manager';

/**
 * Result of content extraction
 */
export interface ExtractionResult {
  /** Whether the extraction was successful */
  success?: boolean;
  /** Extraction error if any */
  error?: string;
  /** Extracted source type */
  sourceType: SourceType | null;
  /** Extracted slides */
  slides?: Slide[];
  /** Complete presentation */
  presentation?: Presentation;
  /** Error context */
  context?: string;
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
   * Apply slide limit for free users - THE DEFINITIVE IMPLEMENTATION
   * This is the single, authoritative place where slide limits are enforced
   * @param slides - Array of slide objects
   * @param limit - Maximum number of slides for free users
   * @returns Promise resolving to limited array of slides (or original if user has pro)
   */
  async applyFreeUserSlideLimit(slides: Slide[]): Promise<Slide[]> {
    // Apply free user slide limit
    const FREE_SLIDE_LIMIT = 6;
      
    // Get subscription status using async methods
    const hasPro = await configManager.hasPro();
    
    // If user has pro subscription, no need to limit slides
    if (hasPro) {
      return slides;
    }

    const limit = FREE_SLIDE_LIMIT;
    
    // For free users, only apply limit if they exceed the maximum
    if (slides.length > limit) {
      // Get the first slides up to the limit
      const limitedSlides = slides.slice(0, limit);
      
      // No notice on first slide - removed for cleaner presentation
      
      // Add a "Upgrade to Pro" slide at the end
      const upgradeSlide: Slide = {
        title: 'You have hit Slide 6',
        content: `

You're doing great! Most stories are best told in 6 slides - but if yours needs more room, consider to unlock and support us.

<div style="text-align: center; margin-top: 30px;">
<a href="https://6slides.com/" style="background: #7C63F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Upgrade to go beyond</a>
</div>`,
        sourceType: 'upgrade'
      };
      
      limitedSlides.push(upgradeSlide);
      return limitedSlides;
    }
    
    // If within the limit, return all slides
    return slides;
  }
  
  /**
   * Extract content from a document
   * @param document - The document to extract from
   * @param url - The page URL
   * @returns Extraction result with slides or error
   */
  async extractContent(document: Document, url: string): Promise<ExtractionResult> {
    try {
      // Detect content source
      const sourceType = source_manager.detectSource(document, url);
      
      if (!sourceType) {
        return {
          error: 'Unsupported content source. Please use a Notion page or Markdown file.',
          sourceType: null
        };
      }
      
      // Get appropriate extractor
      const extractor = source_manager.getExtractor(sourceType, document);
      
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
      const processedSlides = content_processor.process(slidesWithSourceType);
      
      // Ensure all slides have required properties and preserve subslides
      const validSlides = processedSlides.map(slide => {
        // Create base slide with required properties
        const validSlide: { 
          title: string; 
          content: string; 
          sourceType: string; 
          metadata: any; 
          subslides?: any[] 
        } = {
          title: slide.title || 'Untitled Slide',
          content: slide.content || '',
          sourceType: slide.sourceType || sourceType.toString(),
          metadata: slide.metadata
        };
        
        // Preserve subslides if they exist
        if (slide.subslides && Array.isArray(slide.subslides) && slide.subslides.length > 0) {
          validSlide.subslides = slide.subslides;
        }
        
        return validSlide;
      });
      
      // Apply the single, authoritative slide limit
      const limitedSlides = await this.applyFreeUserSlideLimit(validSlides);
      
      // Create a domain presentation model
      const presentation = Presentation.fromSlides(limitedSlides, sourceType.toString());
      
      // Clear existing slides and save the new ones
      // This ensures no "upgrade" slides remain in storage from previous extractions
      await storage.clearSlides();
      await storage.saveSlides(presentation.toObject().slides);
      
      // Log debug info
      loggingService.debug('Content extraction complete', {
        sourceType: sourceType.toString(),
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
      // Log the error
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      loggingService.error('Content extraction failed', {
        error: errorObj,
        context: 'content_extraction',
        url
      });
      
      // Return error result
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        context: 'content_extraction',
        sourceType: null
      };
    }
  }
}

// Export a singleton instance
export const content_controller = new ContentController();
