/**
 * Six Slides - Content Processor
 * 
 * Normalizes content from different sources into a standard format
 */

import { loggingService } from '../services/logging_service';
import { Slide } from './domain/index';

/**
 * Raw slide interface with minimal required fields
 */
interface RawSlide {
  title?: string;
  content?: string;
  sourceType?: string;
  [key: string]: any;
}

/**
 * Content Processor class
 * Processes and normalizes content from different extractors
 */
class ContentProcessor {
  /**
   * Process raw content into normalized slides
   * @param rawSlides - Raw slide data from extractors
   * @returns Normalized slide data
   */
  process(rawSlides: RawSlide[]): RawSlide[] {
    try {
      loggingService.debug('Processing raw content', { slideCount: rawSlides.length });
      
      if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
        loggingService.error('No slides to process');
        return [];
      }
      
      // Normalize each slide - using arrow function to preserve 'this' context
      const processedSlides = rawSlides.map(slide => this.normalizeSlide(slide));
      
      loggingService.debug('Content processing complete', { processedCount: processedSlides.length });
      return processedSlides;
    } catch (error) {
      loggingService.error('Error processing content', error);
      return rawSlides; // Return original content on error
    }
  }
  
  /**
   * Normalize a single slide
   * @param slide - Raw slide data
   * @returns Normalized slide
   */
  normalizeSlide(slide: RawSlide): RawSlide {
    // Ensure we have standard properties
    const normalized: RawSlide = {
      title: slide.title || '',
      content: slide.content || '',
      sourceType: slide.sourceType || 'unknown'
    };
    
    // Handle subslides if they exist
    if (slide.subslides && Array.isArray(slide.subslides) && slide.subslides.length > 0) {
      // Normalize each subslide - bind 'this' to ensure context is preserved
      normalized.subslides = slide.subslides.map((subslide) => this.normalizeSlide.bind(this)(subslide));
    }
    
    // Normalize markdown content
    if (normalized.content) {
      // Ensure proper spacing between elements
      normalized.content = normalized.content
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Standardize heading formats
      normalized.content = normalized.content
        .replace(/^(#+)(?!\s)/gm, '$1 '); // Ensure space after # in headings
      
      // Standardize list formats - preserve indentation for nested lists
      normalized.content = normalized.content
        .replace(/^(\s*)[*+-](?!\s)/gm, '$1- '); // Standardize list markers with space
    }
    
    return normalized;
  }
}

// Export a singleton instance
export const content_processor = new ContentProcessor();
