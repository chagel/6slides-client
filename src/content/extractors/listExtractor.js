/**
 * Notion to Slides - List Extractor
 * 
 * Extracts list elements from Notion pages
 */

import { BaseExtractor } from './baseExtractor.js';

export class ListExtractor extends BaseExtractor {
  /**
   * Check if an element is a list
   * @param {Element} element - Element to check
   * @returns {boolean} - True if element is a list
   */
  isList(element) {
    return element.tagName === 'UL' || 
           element.tagName === 'OL' || 
           (element.className && (
             this.hasClass(element, 'notion-bulleted_list-block') ||
             this.hasClass(element, 'notion-numbered_list-block') ||
             this.hasClass(element, 'notion-to_do-block') ||
             this.hasClass(element, 'notion-toggle-block') ||
             this.hasClass(element, 'notion-list-block')
           ));
  }
  
  /**
   * Process a list element and convert to markdown
   * @param {Element} listElement - The list element (ul, ol, or Notion list block)
   * @returns {string} - Markdown formatted list
   */
  listToMarkdown(listElement) {
    // For simple Notion list blocks, just get the text with a bullet
    if (!listElement.tagName.match(/^(UL|OL)$/i)) {
      return `- ${this.getElementText(listElement)}`;
    }
    
    // For standard HTML lists, process each list item
    const items = Array.from(listElement.querySelectorAll('li'));
    
    if (!items.length) {
      return '';
    }
    
    // Check if this is an ordered list
    const isOrdered = listElement.tagName === 'OL';
    
    // Process each list item
    return items.map((item, index) => {
      const text = this.getElementText(item);
      
      // Use numbers for ordered lists, bullets for unordered
      return isOrdered ? 
        `${index + 1}. ${text}` : 
        `- ${text}`;
    }).join('\n');
  }
  
  /**
   * Find and extract all lists in the document
   * @returns {Element[]} - Array of list elements
   */
  extractLists() {
    // Get standard HTML lists
    const htmlLists = [
      ...this.findElements('ul'),
      ...this.findElements('ol')
    ];
    
    // Get Notion-specific lists
    const notionLists = this.findElements([
      '.notion-bulleted_list-block',
      '.notion-numbered_list-block',
      '.notion-to_do-block',
      '.notion-toggle-block',
      '.notion-list-block'
    ].join(', '));
    
    const allLists = [...htmlLists, ...notionLists];
    this.debug(`Found ${allLists.length} lists`);
    
    return allLists;
  }
}