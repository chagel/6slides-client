/**
 * Notion to Slides - Content Controller
 * 
 * Manages content extraction from various sources
 */

import { loggingService } from '../services/logging_service';
import { source_manager, SourceType } from '../models/source_manager';
import { content_processor } from '../models/content_processor';
import { storage } from '../models/storage';
import { Presentation } from '../models/domain/presentation';
import { errorService, ErrorTypes } from '../services/error_service';
import { Slide } from '../types/index';
import { configManager } from '../models/config_manager';

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
   * Apply slide limit for free users - THE DEFINITIVE IMPLEMENTATION
   * This is the single, authoritative place where slide limits are enforced
   * @param slides - Array of slide objects
   * @param limit - Maximum number of slides for free users
   * @returns Limited array of slides (or original if user has pro)
   */
  private applyFreeUserSlideLimit(slides: Slide[], limit: number): Slide[] {
    // Get subscription status
    const hasPro = configManager.hasPro();
    const level = configManager.getSubscriptionLevel();
    
    // Log subscription status for debugging
    console.log('%c[Subscription Status]', 'background: #ff9800; color: white; padding: 2px 6px; border-radius: 4px;',
      `Content processing with ${level.toUpperCase()} subscription (Pro features: ${hasPro ? 'Enabled' : 'Disabled'})`);
    
    // If user has pro subscription, no need to limit slides
    if (hasPro) {
      loggingService.debug(`Pro user - no slide limit applied. Total slides: ${slides.length}`, null, 'extraction');
      console.log('%c[Content Processing]', 'background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px;',
        `Pro user - no slide limit needed. Slides: ${slides.length}`);
      return slides;
    }
    
    // For free users, only apply limit if they exceed the maximum
    if (slides.length > limit) {
      loggingService.debug(`Free user slide limit applied: ${limit}/${slides.length} slides`, null, 'extraction');
      console.log('%c[Content Processing]', 'background: #ff9800; color: white; padding: 2px 6px; border-radius: 4px;',
        `Free user slide limit applied: ${limit}/${slides.length} slides`);
      
      // Get the first slides up to the limit
      const limitedSlides = slides.slice(0, limit);
      
      // Add a notice to the first slide when slides exceed the limit
      if (limitedSlides.length > 0) {
        const firstSlide = limitedSlides[0];
        
        // Add a notice at the top of the first slide content
        const freeNotice = `<div class="free-plan-notice" style="border-left: 3px solid #e74c3c; background: rgba(231, 76, 60, 0.1); padding: 8px 12px; margin-bottom: 20px; font-size: 14px;">
Free plan: Limited to ${limit} slides. ${slides.length - limit} slides hidden. <a href="https://notion-slides.com/pricing" style="color: #e74c3c;">Upgrade to Pro</a> for unlimited access.
</div>`;
        
        // Add the notice at the beginning of the content
        firstSlide.content = freeNotice + firstSlide.content;
      }
      
      // Add a "Upgrade to Pro" slide at the end
      const upgradeSlide: Slide = {
        title: 'Unlock More Slides with Pro',
        content: `You've reached the free limit of ${limit} slides.

## Upgrade to Pro to unlock:
- **Unlimited slides** for all your presentations (${slides.length - limit} more slides in this presentation)
- **Premium themes** to make your slides stand out
- **Markdown support** for more advanced usage

[Upgrade Now](https://notion-slides.com/pricing)`,
        sourceType: 'upgrade'
      };
      
      limitedSlides.push(upgradeSlide);
      return limitedSlides;
    }
    
    // If within the limit, return all slides
    console.log('%c[Content Processing]', 'background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px;',
      `Free user with ${slides.length} slides (within limit of ${limit})`);
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
      loggingService.debug('Extracting content from URL:', { url }, 'extraction');
      console.log('%c[Content Extraction Start]', 'background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px;', 
        { url, documentTitle: document.title });
      
      // Detect content source
      const sourceType = source_manager.detectSource(document, url);
      
      if (!sourceType) {
        console.error('[Content Extraction] Unsupported content source', { url, documentTitle: document.title });
        return {
          error: 'Unsupported content source. Please use a Notion page or Markdown file.',
          sourceType: null
        };
      }
      
      loggingService.debug(`Using extractor for source type: ${sourceType}`, null, 'extraction');
      console.log('%c[Content Extraction]', 'background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px;', 
        `Detected source type: ${sourceType}`);
      
      // Get appropriate extractor
      const extractor = source_manager.getExtractor(sourceType, document);
      
      // Extract raw content
      console.log('%c[Content Extraction]', 'background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px;', 
        'Starting extraction with extractor...');
      
      const rawSlides = extractor.extract();
      
      console.log('%c[Content Extraction]', 'background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px;', 
        `Extraction complete. Slides found: ${rawSlides ? rawSlides.length : 0}`);
      
      if (!rawSlides || rawSlides.length === 0) {
        console.error('[Content Extraction] No slides found', { 
          documentTitle: document.title,
          h1Count: document.querySelectorAll('h1').length,
          bodyContent: document.body.innerText.substring(0, 200) + '...' // First 200 chars
        });
        
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
      
      loggingService.debug(`Extracted and processed ${processedSlides.length} slides`);
      
      // Ensure all slides have required properties
      const validSlides = processedSlides.map(slide => ({
        title: slide.title || 'Untitled Slide',
        content: slide.content || '',
        sourceType: slide.sourceType || sourceType.toString(),
        metadata: slide.metadata
      }));
      
      // Apply free user slide limit
      const FREE_SLIDE_LIMIT = 10;
      
      // Apply the single, authoritative slide limit
      const limitedSlides = this.applyFreeUserSlideLimit(validSlides, FREE_SLIDE_LIMIT);
      
      // Create a domain presentation model
      const presentation = Presentation.fromSlides(limitedSlides, sourceType.toString());
      
      console.log('%c[Content Extraction]', 'background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px;', 
        `Creating final presentation with ${presentation.slideCount} slides`);
      
      // Store the presentation
      await storage.saveSlides(presentation.toObject().slides);
      
      console.log('%c[Content Extraction]', 'background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px;', 
        'Slides saved to storage, extraction complete', {
          slidesCount: presentation.slideCount,
          firstSlideTitle: presentation.slides[0]?.title || 'No title',
          hasFreeLimit: configManager.hasPro() ? 'No (Pro user)' : `Yes (Limited to ${limitedSlides.length} slides)`
        });
      
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
export const content_controller = new ContentController();