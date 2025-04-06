/**
 * Notion to Slides - Heading Extractor
 * 
 * Extracts heading elements from Notion pages
 */

import { BaseExtractor } from '../baseExtractor.js';

export class HeadingExtractor extends BaseExtractor {
  /**
   * Extract headings of a specific level
   * @param {number} level - Heading level (1, 2, or 3)
   * @returns {Element[]} - Array of heading elements
   */
  extractHeadingsOfLevel(level) {
    // Build selectors for both HTML and Notion-specific headings
    let selectors = [];
    
    // Standard HTML selector
    selectors.push(`h${level}`);
    
    // Notion-specific selectors
    if (level === 1) {
      selectors.push('.notion-header-block');
      selectors.push('[class*="notion-h1"]');
    } else if (level === 2) {
      selectors.push('[class*="notion-sub_header-block"]');
      selectors.push('[class*="notion-h2"]');
    } else if (level === 3) {
      selectors.push('[class*="notion-h3"]');
    }
    
    // Query all matching elements
    const headings = this.findElements(selectors.join(', '));
    this.debug(`Found ${headings.length} H${level} headings`);
    
    return headings;
  }
  
  /**
   * Check if an element is a heading of a specific level
   * @param {Element} element - Element to check
   * @param {number} level - Heading level (1, 2, or 3)
   * @returns {boolean} - True if element is a heading of the specified level
   */
  isHeadingElement(element, level) {
    // Standard HTML heading
    if (element.tagName === `H${level}`) {
      return true;
    }
    
    // Notion-specific heading classes
    const className = element.className || '';
    
    if (level === 1 && (
      this.hasClass(element, 'notion-header-block') || 
      this.hasClass(element, 'notion-h1')
    )) {
      return true;
    }
    
    if (level === 2 && (
      this.hasClass(element, 'notion-sub_header-block') ||
      this.hasClass(element, 'notion-h2')
    )) {
      return true;
    }
    
    if (level === 3 && this.hasClass(element, 'notion-h3')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Convert a heading element to markdown format
   * @param {Element} element - Heading element
   * @param {number} level - Heading level (1, 2, or 3)
   * @returns {string} - Markdown formatted heading
   */
  headingToMarkdown(element, level) {
    const text = this.getElementText(element);
    return `${'#'.repeat(level)} ${text}`;
  }
}