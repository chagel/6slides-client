/**
 * Notion to Slides - List Extractor
 * 
 * Extracts list elements from Notion pages
 */

import { BaseExtractor } from '../base_extractor';
import { IListExtractor } from './types';

/**
 * List group interface 
 */
interface ListGroup {
  type: 'ordered' | 'unordered';
  elements: Element[];
}

export class ListExtractor extends BaseExtractor implements IListExtractor {
  /**
   * Check if an element is a list
   * @param element - Element to check
   * @returns True if element is a list
   */
  isList(element: Element): boolean {
    // Check standard list elements
    if (element.tagName === 'UL' || 
        element.tagName === 'OL' || 
        (element.className && (
          this.hasClass(element, 'notion-bulleted_list-block') ||
          this.hasClass(element, 'notion-numbered_list-block') ||
          this.hasClass(element, 'notion-to_do-block') ||
          this.hasClass(element, 'notion-toggle-block') ||
          this.hasClass(element, 'notion-list-block')
        ))) {
      return true;
    }
    
    // Also check paragraph-like elements that might contain list items
    if (element.tagName === 'P' || element.tagName === 'DIV') {
      const text = this.getElementText(element).trim();
      
      // Check for numbered list pattern (e.g., "1. Item text")
      if (/^\d+\.?\s+.*/.test(text)) {
        return true;
      }
      
      // Check for "item X" pattern which is a common notation for list items
      if (/^item\s+\d+\s*.*$/i.test(text)) {
        return true;
      }
      
      // Check for bullet points
      if (text.startsWith('- ') || text.startsWith('* ')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Determine if an element is an ordered list item
   * @param element - Element to check
   * @returns True if element is an ordered list item
   */
  isOrderedListItem(element: Element): boolean {
    if (element.tagName === 'OL') {
      return true;
    }
    
    if (this.hasClass(element, 'notion-numbered_list-block')) {
      return true;
    }
    
    // Check paragraph-like elements for numbered list pattern
    if ((element.tagName === 'P' || element.tagName === 'DIV')) {
      const text = this.getElementText(element).trim();
      if (/^\d+\.?\s+.*/.test(text)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Process multiple elements that form a list
   * @param listElements - Array of elements that form a list
   * @param isOrdered - Whether this is an ordered list
   * @returns Markdown list with proper formatting
   */
  processList(listElements: Element[], isOrdered = false): string {
    if (!listElements || listElements.length === 0) {
      return '';
    }
    
    this.debug(`Processing list with ${listElements.length} items, ordered: ${isOrdered}`);
    
    // Extract text from each element
    const textItems = listElements.map(element => this.getElementText(element).trim());
    
    // Format as markdown list items
    const listItems = textItems.map((text, index) => {
      // For ordered lists, use sequential numbers
      if (isOrdered) {
        return `${index + 1}. ${text}`;
      } else {
        return `- ${text}`;
      }
    });
    
    // Join with newlines for proper list formatting
    return listItems.join('\n');
  }

  /**
   * Process a list element and convert to markdown
   * @param listElement - The list element (ul, ol, or Notion list block)
   * @returns Markdown formatted list
   */
  listToMarkdown(listElement: Element): string {
    // Process standard list elements (UL, OL)
    if (listElement.tagName === 'UL' || listElement.tagName === 'OL') {
      const items = Array.from(listElement.querySelectorAll('li'));
      
      if (!items.length) {
        return '';
      }
      
      // Check if this is an ordered list
      const isOrdered = listElement.tagName === 'OL';
      
      // Process each list item and join with newlines
      const listItems = items.map((item, index) => {
        const text = this.getElementText(item);
        
        // Use numbers for ordered lists, bullets for unordered
        return isOrdered ? 
          `${index + 1}. ${text}` : 
          `- ${text}`;
      });
      
      // Join with single newlines to ensure proper list formatting
      return listItems.join('\n');
    }
    
    // Process Notion-specific list blocks
    if (listElement.className && (
      this.hasClass(listElement, 'notion-bulleted_list-block') ||
      this.hasClass(listElement, 'notion-to_do-block') ||
      this.hasClass(listElement, 'notion-toggle-block') ||
      this.hasClass(listElement, 'notion-list-block')
    )) {
      return `- ${this.getElementText(listElement)}`;
    }
    
    if (this.hasClass(listElement, 'notion-numbered_list-block')) {
      return `1. ${this.getElementText(listElement)}`;
    }
    
    // Handle paragraph or div elements that contain list-like content
    if (listElement.tagName === 'P' || listElement.tagName === 'DIV') {
      const text = this.getElementText(listElement).trim();
      
      // Check for numbered list item (e.g., "1. Item text")
      const numberedMatch = text.match(/^(\d+)\.?\s+(.*)/);
      if (numberedMatch) {
        return `1. ${numberedMatch[2].trim()}`;  // Always use 1. for proper markdown ordered lists
      }
      
      // Check for "item X" pattern (convert to bullet point)
      const itemMatch = text.match(/^item\s+\d+\s*(.*)/i);
      if (itemMatch) {
        // If there's content after "item X", include it
        const content = itemMatch[1] ? itemMatch[1].trim() : text.trim();
        return `- ${content}`;
      }
      
      // Check for existing bullet points
      if (text.startsWith('- ') || text.startsWith('* ')) {
        return text;
      }
    }
    
    // Fallback: treat as a bullet point
    return `- ${this.getElementText(listElement)}`;
  }
  
  /**
   * Finds groups of consecutive list elements in a section
   * @param startElement - First element to check
   * @param endElement - Last element to check or null
   * @returns Array of list groups with type and elements
   */
  findListGroups(startElement: Element, endElement: Element | null = null): ListGroup[] {
    const listGroups: ListGroup[] = [];
    let currentElement: Element | null = startElement;
    
    // Variables to track the current list group
    let currentGroup: ListGroup | null = null;
    
    while (currentElement && currentElement !== endElement) {
      if (this.isList(currentElement)) {
        // Determine list type
        const isOrdered = this.isOrderedListItem(currentElement);
        const listType = isOrdered ? 'ordered' : 'unordered';
        
        // Check if we need to start a new group or continue the current one
        if (!currentGroup || currentGroup.type !== listType) {
          // End previous group if it exists
          if (currentGroup) {
            listGroups.push(currentGroup);
          }
          
          // Start a new group
          currentGroup = {
            type: listType,
            elements: [currentElement]
          };
        } else {
          // Continue current group
          currentGroup.elements.push(currentElement);
        }
      } else if (currentGroup) {
        // End the current group when we hit a non-list element
        listGroups.push(currentGroup);
        currentGroup = null;
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    // Add the last group if it exists
    if (currentGroup) {
      listGroups.push(currentGroup);
    }
    
    return listGroups;
  }

  /**
   * Find and extract all lists in the document
   * @returns Array of list elements
   */
  extractLists(): Element[] {
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
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // List extraction is typically part of a larger extraction process
    return [];
  }
}