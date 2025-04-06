/**
 * Notion to Slides - Base Extractor
 * 
 * Base class for all content extractors
 */

import { logDebug, logError } from '../../common/utils.js';

export class BaseExtractor {
  /**
   * Constructor for the base extractor
   * @param {Document} document - DOM document to extract from
   */
  constructor(document) {
    if (new.target === BaseExtractor) {
      throw new Error('BaseExtractor is an abstract class and cannot be instantiated directly');
    }
    
    this.document = document;
  }
  
  /**
   * Extract content from the document
   * This method must be implemented by subclasses
   * @returns {Object[]} - Array of slide objects with content
   */
  extract() {
    throw new Error('extract() method must be implemented by subclass');
  }
  
  /**
   * Validates extracted content
   * @param {Object[]} slides - The extracted slides
   * @returns {boolean} - Whether the content is valid
   */
  validateContent(slides) {
    try {
      // Basic validation
      if (!Array.isArray(slides) || slides.length === 0) {
        logError('Invalid slides: Empty or not an array');
        return false;
      }
      
      // Check if each slide has the required properties
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (!slide.title && !slide.content) {
          logError(`Invalid slide at index ${i}: Missing title and content`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logError('Error validating content', error);
      return false;
    }
  }
  
  /**
   * Process and normalize extracted content
   * @param {Object[]} rawSlides - The raw extracted slides
   * @returns {Object[]} - Normalized slides
   */
  processContent(rawSlides) {
    // Default implementation just returns the raw slides
    // Subclasses can override this to provide custom processing
    return rawSlides;
  }
  
  /**
   * Find all elements matching a specific CSS selector
   * @param {string} selector - CSS selector
   * @returns {Element[]} - Array of elements matching the selector
   */
  findElements(selector) {
    return Array.from(this.document.querySelectorAll(selector));
  }
  
  /**
   * Check if an element has a specific class
   * @param {Element} element - DOM element
   * @param {string} className - Class name to check for
   * @returns {boolean} - True if element has the class
   */
  hasClass(element, className) {
    return element.className && element.className.includes(className);
  }
  
  /**
   * Get the normalized text content of an element
   * @param {Element} element - DOM element
   * @returns {string} - Normalized text content
   */
  getElementText(element) {
    return element ? (element.innerText || '').trim() : '';
  }
  
  /**
   * Log debug information
   * @param {string} message - Debug message
   * @param {any} data - Optional debug data
   */
  debug(message, data) {
    logDebug(`[${this.constructor.name}] ${message}`, data);
  }
}