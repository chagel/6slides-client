/**
 * Six Slides - List Extractor
 * 
 * Extracts list elements from Notion pages
 */

import { BaseExtractor } from '../base_extractor';
import { IListExtractor } from './types';


export class ListExtractor extends BaseExtractor implements IListExtractor {
  /**
   * Check if an element is a list
   * @param element - Element to check
   * @returns True if element is a list
   */
  isList(element: Element): boolean {
    // Check Notion list block elements
    if (element.className && (
      this.hasClass(element, 'notion-bulleted_list-block') ||
      this.hasClass(element, 'notion-numbered_list-block') ||
      this.hasClass(element, 'notion-to_do-block') ||
      this.hasClass(element, 'notion-toggle-block') ||
      this.hasClass(element, 'notion-list-block')
    )) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Determine if an element is an ordered list item
   * @param element - Element to check
   * @returns True if element is an ordered list item
   */
  isOrderedListItem(element: Element): boolean {
    if (this.hasClass(element, 'notion-numbered_list-block')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the indentation level of a Notion list item by checking parent elements
   * @param element - The list element to check
   * @returns The indentation level (0-based)
   */
  getIndentationLevel(element: Element): number {
    // Calculate indentation based on the parent structure
    let level = 0;
    let current = element;
    
    // Count how many list block parents we have
    while (current.parentElement) {
      current = current.parentElement;
      
      // Check if parent is also a list block
      if (this.hasClass(current, 'notion-bulleted_list-block') || 
          this.hasClass(current, 'notion-numbered_list-block')) {
        level++;
      }
    }
    
    // Return the calculated indentation level
    return level;
  }
  
  /**
   * Process multiple elements that form a list
   * NOTE: This method is used only for testing purposes and is not used in the actual extraction
   * 
   * @param listElements - Array of elements that form a list
   * @param isOrdered - Whether this is an ordered list (not actually used)
   * @returns Markdown list with proper formatting
   */
  processList(listElements: Element[], isOrdered = false): string {
    if (!listElements || listElements.length === 0) {
      return '';
    }
    
    // Process each list element individually with its proper indentation
    const listItems = listElements.map(element => {
      return this.listToMarkdown(element);
    });
    
    // Join with newlines for proper list formatting
    return listItems.join('\n');
  }

  /**
   * Find the element containing the actual list item text
   * Optimized for the structure of Notion's list items based on the provided HTML
   * 
   * @param element List block element
   * @returns The element containing the text content or null if not found
   */
  findTextElement(element: Element): Element | null {
    // First look for the data-content-editable-leaf="true" element (newer Notion format)
    // This is the most specific selector that targets just the text node
    const editableLeaf = element.querySelector('[data-content-editable-leaf="true"]');
    if (editableLeaf) {
      return editableLeaf;
    }
    
    // Next try to find any contenteditable=true element (also common in Notion)
    const contentEditables = element.querySelectorAll('[contenteditable="true"]');
    if (contentEditables.length > 0) {
      // In case there are multiple, prefer the first one that's not inside a nested list
      for (let i = 0; i < contentEditables.length; i++) {
        const editable = contentEditables[i];
        let parent = editable.parentElement;
        let isInNestedList = false;
        
        // Check if this editable is inside a nested list
        while (parent && parent !== element) {
          if (this.isList(parent)) {
            isInNestedList = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        if (!isInNestedList) {
          return editable;
        }
      }
      
      // If all are in nested lists, return the first one anyway
      return contentEditables[0];
    }
    
    // If there are no contenteditable elements, look for elements with specific classes
    // In current Notion layouts, list text is often in specific div structures
    const notionTextElements = element.querySelectorAll('div[style*="flex: 1"]');
    if (notionTextElements.length > 0) {
      return notionTextElements[0];
    }
    
    // As a fallback, return the element itself
    return element;
  }
  
  /**
   * Get direct text content from a list element, excluding child element text
   * Based on Notion's actual DOM structure
   * 
   * @param element - The element to get text from
   * @returns Direct text content
   */
  getDirectListText(element: Element): string {
    // Find the element containing the text
    const textElement = this.findTextElement(element);
    if (!textElement) {
      // Fallback to trying to get just text nodes from the element
      let directText = '';
      for (let i = 0; i < element.childNodes.length; i++) {
        const node = element.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          directText += node.textContent || '';
        }
      }
      return directText.trim();
    }
    
    // Get the text from the found element
    const text = textElement.textContent || '';
    
    // Clean up text further by removing any nested list content
    let cleanedText = text.trim();
    
    // Find any child list elements within this one and remove their text
    const childLists = [];
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      if (this.isList(child as Element)) {
        childLists.push(child);
      }
    }
    
    // Subtract text from child lists
    if (childLists.length > 0) {
      for (const childList of childLists) {
        const childText = childList.textContent || '';
        if (childText) {
          cleanedText = cleanedText.replace(childText, '').trim();
        }
      }
    }
    
    // Never return empty text from a list item
    if (!cleanedText) {
      return '';
    }
    
    return cleanedText;
  }
  
  /**
   * Process a list element and convert to markdown
   * @param listElement - The list element (Notion list block)
   * @returns Markdown formatted list or empty string for empty items
   */
  listToMarkdown(listElement: Element): string {
    // Get direct text content without child element text
    const text = this.getDirectListText(listElement);
    
    // Skip list items with empty or whitespace-only text
    if (!text || text.trim() === '') {
      return '';
    }
    
    // Get indentation level for nested lists
    const level = this.getIndentationLevel(listElement);
    
    // Add correct indentation (2 spaces per level) for nested list items
    // Using the proper indent amount (2 spaces per level) is crucial for reveal.js
    const indent = '  '.repeat(level);
    
    let result = '';
    
    // Process Notion-specific list blocks
    if (listElement.className) {
      // Unordered lists
      if (this.hasClass(listElement, 'notion-bulleted_list-block') || 
          this.hasClass(listElement, 'notion-to_do-block') ||
          this.hasClass(listElement, 'notion-toggle-block') ||
          this.hasClass(listElement, 'notion-list-block')) {
        result = `${indent}- ${text}`;
        return result;
      }
      
      // Ordered lists
      if (this.hasClass(listElement, 'notion-numbered_list-block')) {
        result = `${indent}1. ${text}`;
        return result;
      }
    }
    
    // Fallback: treat as a bullet point, but only if there's actual content
    if (text.trim()) {
      result = `- ${text}`;
      return result;
    }
    
    // If we reach here, there was no usable content
    return '';
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