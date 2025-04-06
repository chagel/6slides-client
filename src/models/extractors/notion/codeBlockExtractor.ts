/**
 * Notion to Slides - Code Block Extractor
 * 
 * Extracts code blocks from Notion pages
 */

import { BaseExtractor } from '../baseExtractor.js';
import { ICodeBlockExtractor } from './types.js';

export class CodeBlockExtractor extends BaseExtractor implements ICodeBlockExtractor {
  /**
   * Check if an element is a code block
   * @param element - Element to check
   * @returns True if element is a code block
   */
  isCodeBlock(element: Element): boolean {
    if (!element) return false;
    
    // Check for Notion class
    if (this.hasClass(element, 'notion-code-block')) {
      return true;
    }
    
    // Check for PRE tag
    if (element.tagName === 'PRE') {
      return true;
    }
    
    // Check for child code elements
    try {
      if ('querySelector' in element && element.querySelector('pre, code')) {
        return true;
      }
    } catch (e) {
      // Handle JSDOM limitations
    }
    
    return false;
  }
  
  /**
   * Process a code block element and convert to markdown
   * @param codeElement - The code block element
   * @returns Markdown formatted code block
   */
  codeBlockToMarkdown(codeElement: Element): string {
    // Find the actual code element if we have a container
    const codeContent = codeElement.tagName === 'CODE' || codeElement.tagName === 'PRE' ?
      codeElement : 
      codeElement.querySelector('pre, code');
    
    const text = codeContent ? 
      this.getElementText(codeContent) : 
      this.getElementText(codeElement);
    
    if (!text) {
      return '';
    }
    
    // Try to get the language if available
    let language = '';
    
    // Check for language class on the code element
    const className = codeElement.className || '';
    const languageClass = className.match(/language-([a-z0-9]+)/i);
    if (languageClass && languageClass[1]) {
      language = languageClass[1].toLowerCase();
    }
    
    // Check for specific Notion language indicator
    const languageElem = codeElement.querySelector('.notion-code-language');
    if (languageElem) {
      language = this.getElementText(languageElem).toLowerCase();
    }
    
    // Format as markdown code block
    return '```' + language + '\n' + text + '\n```';
  }
  
  /**
   * Find and extract all code blocks in the document
   * @returns Array of code block elements
   */
  extractCodeBlocks(): Element[] {
    // Find Notion code blocks
    const notionCodeBlocks = this.findElements('.notion-code-block');
    
    // Find HTML code blocks
    const htmlCodeBlocks = this.findElements('pre, code').filter(el => {
      // Skip code elements that are children of pre (to avoid duplication)
      if (el.tagName === 'CODE' && el.parentElement && el.parentElement.tagName === 'PRE') {
        return false;
      }
      return true;
    });
    
    const allCodeBlocks = [...notionCodeBlocks, ...htmlCodeBlocks];
    this.debug(`Found ${allCodeBlocks.length} code blocks`);
    
    return allCodeBlocks;
  }
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // Code block extraction is typically part of a larger extraction process
    return [];
  }
}