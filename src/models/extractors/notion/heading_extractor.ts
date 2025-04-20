/**
 * Six Slides - Heading Extractor
 * 
 * Extracts heading elements from Notion pages
 */

import { BaseExtractor } from '../base_extractor';
import { IHeadingExtractor } from './types';

export class HeadingExtractor extends BaseExtractor implements IHeadingExtractor {
  /**
   * Extract headings of a specific level
   * @param level - Heading level (1, 2, or 3)
   * @returns Array of heading elements
   */
  extractHeadingsOfLevel(level: number): Element[] {
    // Build selectors for both HTML and Notion-specific headings
    const selectors: string[] = [];
    
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
   * @param element - Element to check
   * @param level - Heading level (1, 2, or 3)
   * @returns True if element is a heading of the specified level
   */
  isHeadingElement(element: Element, level: number): boolean {
    // Standard HTML heading
    if (element.tagName === `H${level}`) {
      return true;
    }
    
    // Notion-specific heading classes
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
   * @param element - Heading element
   * @param level - Heading level (1, 2, or 3)
   * @returns Markdown formatted heading
   */
  headingToMarkdown(element: Element, level: number): string {
    const text = this.getElementText(element);
    return `${'#'.repeat(level)} ${text}`;
  }
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // Heading extraction is typically part of a larger extraction process
    return [];
  }
}