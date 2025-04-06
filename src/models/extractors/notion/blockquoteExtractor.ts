/**
 * Notion to Slides - Blockquote Extractor
 * 
 * Extracts blockquote elements from documents and converts them to markdown
 */

import { BaseExtractor } from '../baseExtractor.js';

export class BlockquoteExtractor extends BaseExtractor {
  /**
   * Check if an element is a blockquote
   * @param element - The element to check
   * @returns True if the element is a blockquote
   */
  isBlockquote(element: Element): boolean {
    return element.tagName === 'BLOCKQUOTE' || 
           this.hasClass(element, 'notion-quote-block') ||
           this.hasClass(element, 'notion-quote');
  }
  
  /**
   * Convert a blockquote to markdown format
   * @param element - The blockquote element
   * @returns Markdown blockquote
   */
  blockquoteToMarkdown(element: Element): string {
    let text = this.getElementText(element);
    
    // In case the blockquote contains div structure, check for child divs
    // This helps with Notion's unique blockquote structure
    if (element.children && element.children.length > 0) {
      const childTexts: string[] = [];
      
      // Extract text from each child div
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const childText = this.getElementText(child);
        if (childText.trim()) {
          childTexts.push(childText.trim());
        }
      }
      
      // If we found text in child divs, use that instead
      if (childTexts.length > 0) {
        text = childTexts.join('\n');
      }
    }
    
    // Split by newline and format each line with blockquote marker
    const lines = text.split('\n');
    const quotedLines = lines.map(line => `> ${line}`);
    return quotedLines.join('\n');
  }
  
  /**
   * Find all blockquotes in the document
   * @returns Array of blockquote elements
   */
  extractBlockquotes(): Element[] {
    const htmlBlockquotes = this.findElements('blockquote');
    const notionBlockquotes = this.findElements('.notion-quote-block, .notion-quote');
    
    const allBlockquotes = [...htmlBlockquotes, ...notionBlockquotes];
    this.debug(`Found ${allBlockquotes.length} blockquotes`);
    
    return allBlockquotes;
  }
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // since blockquote extraction is typically part of a larger extraction process
    return [];
  }
}