/**
 * Notion to Slides - Base Extractor
 * 
 * Base class for all content extractors
 */

import { logDebug } from '../../common/utils.js';

export class BaseExtractor {
  /**
   * Constructor for the base extractor
   * @param {Document} document - DOM document to extract from
   */
  constructor(document) {
    this.document = document;
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