/**
 * Notion to Slides - Content Processor
 * 
 * Normalizes content from different sources into a standard format
 */

import { loggingService } from '../services/LoggingService.js';

/**
 * Content Processor class
 * Processes and normalizes content from different extractors
 */
class ContentProcessor {
  /**
   * Process raw content into normalized slides
   * @param {Object[]} rawSlides - Raw slide data from extractors
   * @returns {Object[]} - Normalized slide data
   */
  process(rawSlides) {
    try {
      loggingService.debug('Processing raw content', { slideCount: rawSlides.length });
      
      if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
        loggingService.error('No slides to process');
        return [];
      }
      
      // Normalize each slide
      const processedSlides = rawSlides.map(this.normalizeSlide);
      
      loggingService.debug('Content processing complete', { processedCount: processedSlides.length });
      return processedSlides;
    } catch (error) {
      loggingService.error('Error processing content', error);
      return rawSlides; // Return original content on error
    }
  }
  
  /**
   * Normalize a single slide
   * @param {Object} slide - Raw slide data
   * @returns {Object} - Normalized slide
   */
  normalizeSlide(slide) {
    // Ensure we have standard properties
    const normalized = {
      title: slide.title || '',
      content: slide.content || '',
      sourceType: slide.sourceType || 'unknown'
    };
    
    // Normalize markdown content
    // - Ensure proper spacing
    // - Standardize heading formats
    // - Standardize list formats
    if (normalized.content) {
      // Ensure proper spacing between elements
      normalized.content = normalized.content
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Standardize heading formats
      normalized.content = normalized.content
        .replace(/^(#+)(?!\s)/gm, '$1 '); // Ensure space after # in headings
      
      // Standardize list formats
      normalized.content = normalized.content
        .replace(/^(\s*)[*+-](?!\s)/gm, '$1- '); // Standardize list markers with space
    }
    
    return normalized;
  }
}

// Export a singleton instance
export const contentProcessor = new ContentProcessor();