/**
 * Six Slides - Base Extractor
 * 
 * Base class for all content extractors
 */

import { loggingService } from '../../services/logging_service';
import { Slide, ExtractorResult } from '../../types/index';

/**
 * Abstract base class for all content extractors
 */
export abstract class BaseExtractor {
  protected document: Document;

  /**
   * Constructor for the base extractor
   * @param document - DOM document to extract from
   */
  constructor(document: Document) {
    if (new.target === BaseExtractor) {
      throw new Error('BaseExtractor is an abstract class and cannot be instantiated directly');
    }
    
    this.document = document;
  }
  
  /**
   * Extract content from the document
   * This method must be implemented by subclasses
   * @returns Array of slide objects with content
   */
  abstract extract(): Slide[];
  
  /**
   * Validates extracted content
   * @param slides - The extracted slides
   * @returns Whether the content is valid
   */
  validateContent(slides: Slide[]): boolean {
    try {
      // Basic validation
      if (!Array.isArray(slides) || slides.length === 0) {
        loggingService.error('Invalid slides: Empty or not an array');
        return false;
      }
      
      // Check if each slide has the required properties
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (!slide.title && !slide.content) {
          loggingService.error(`Invalid slide at index ${i}: Missing title and content`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      loggingService.error('Error validating content', error);
      return false;
    }
  }
  
  /**
   * Process and normalize extracted content
   * @param rawSlides - The raw extracted slides
   * @returns Normalized slides
   */
  processContent(rawSlides: Slide[]): Slide[] {
    // Default implementation just returns the raw slides
    // Subclasses can override this to provide custom processing
    return rawSlides;
  }
  
  /**
   * Find all elements matching a specific CSS selector
   * @param selector - CSS selector
   * @returns Array of elements matching the selector
   */
  findElements(selector: string): Element[] {
    return Array.from(this.document.querySelectorAll(selector));
  }
  
  /**
   * Check if an element has a specific class
   * @param element - DOM element
   * @param className - Class name to check for
   * @returns True if element has the class
   */
  hasClass(element: Element | null, className: string): boolean {
    if (!element || !element.className) return false;
    return typeof element.className === 'string' && 
           element.className.includes(className);
  }
  
  /**
   * Get the normalized text content of an element
   * @param element - DOM element
   * @returns Normalized text content
   */
  getElementText(element: Element | null): string {
    if (!element) return '';
    // Use textContent for JSDOM compatibility and innerText for real browsers
    const text = (element as HTMLElement).innerText || element.textContent || '';
    return text.trim();
  }
  
  /**
   * Log debug information
   * @param message - Debug message
   * @param data - Optional debug data
   */
  debug(message: string, data?: unknown): void {
    loggingService.debug(`[${this.constructor.name}] ${message}`, data || undefined);
  }
}