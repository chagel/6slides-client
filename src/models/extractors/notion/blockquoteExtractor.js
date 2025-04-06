/**
 * Notion to Slides - Blockquote Extractor
 * 
 * Extracts blockquote elements from documents and converts them to markdown
 */

import { BaseExtractor } from '../baseExtractor.js';

export class BlockquoteExtractor extends BaseExtractor {
  /**
   * Check if an element is a blockquote
   * @param {Element} element - The element to check
   * @returns {boolean} - True if the element is a blockquote
   */
  isBlockquote(element) {
    return element.tagName === 'BLOCKQUOTE' || 
           this.hasClass(element, 'notion-quote-block') ||
           this.hasClass(element, 'notion-quote');
  }
  
  /**
   * Convert a blockquote to markdown format
   * @param {Element} element - The blockquote element
   * @returns {string} - Markdown blockquote
   */
  blockquoteToMarkdown(element) {
    const lines = this.getElementText(element).split('\n');
    const quotedLines = lines.map(line => `> ${line}`);
    return quotedLines.join('\n');
  }
  
  /**
   * Find all blockquotes in the document
   * @returns {Element[]} - Array of blockquote elements
   */
  extractBlockquotes() {
    const htmlBlockquotes = this.findElements('blockquote');
    const notionBlockquotes = this.findElements('.notion-quote-block, .notion-quote');
    
    const allBlockquotes = [...htmlBlockquotes, ...notionBlockquotes];
    this.debug(`Found ${allBlockquotes.length} blockquotes`);
    
    return allBlockquotes;
  }
}