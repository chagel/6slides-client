/**
 * Notion to Slides - Notion Extractor
 * 
 * Extracts content from Notion pages
 */

import { loggingService } from '../../../services/LoggingService.js';
import { BaseExtractor } from '../baseExtractor.js';
import { HeadingExtractor } from './headingExtractor.js';
import { ListExtractor } from './listExtractor.js';
import { CodeBlockExtractor } from './codeBlockExtractor.js';
import { TableExtractor } from './tableExtractor.js';
import { BlockquoteExtractor } from './blockquoteExtractor.js';
import { ParagraphExtractor } from './paragraphExtractor.js';
import { ImageExtractor } from './imageExtractor.js';

/**
 * Extracts content from Notion pages
 */
export class NotionExtractor extends BaseExtractor {
  /**
   * Constructor
   * @param {Document} document - The document to extract from
   */
  constructor(document) {
    super(document);
    
    // Initialize component extractors
    this.headingExtractor = new HeadingExtractor(document);
    this.listExtractor = new ListExtractor(document);
    this.codeBlockExtractor = new CodeBlockExtractor(document);
    this.tableExtractor = new TableExtractor(document);
    this.blockquoteExtractor = new BlockquoteExtractor(document);
    this.paragraphExtractor = new ParagraphExtractor(document);
    this.imageExtractor = new ImageExtractor(document);
  }
  
  /**
   * Extract content from Notion page
   * @returns {Object[]} - Array of slide objects
   */
  extract() {
    try {
      this.debug('Starting extraction from Notion page');
      
      // Find all H1 elements (slide breaks)
      const slideBreaks = this.findElements('h1, .notion-header-block');
      this.debug(`Found ${slideBreaks.length} potential slides (H1 elements)`);
      
      if (slideBreaks.length === 0) {
        loggingService.error('No slide breaks (H1 elements) found in the document');
        return [];
      }
      
      const slides = [];
      
      // Process each slide break
      for (let i = 0; i < slideBreaks.length; i++) {
        const currentBreak = slideBreaks[i];
        const nextBreak = slideBreaks[i + 1];
        
        // Get slide title from the current break
        let title = this.getElementText(currentBreak).trim();
        
        // Get content between current and next break
        let content = this.getContentBetweenBreaks(currentBreak, nextBreak);
        
        // Clean up HTML entities and normalize content
        content = content
          .replace(/\n{3,}/g, '\n\n')     // Replace 3+ consecutive newlines with 2
          .replace(/\&nbsp;/g, ' ')       // Replace HTML non-breaking spaces
          .replace(/\&lt;/g, '<')         // Decode HTML entities
          .replace(/\&gt;/g, '>')
          .replace(/\&quot;/g, '"')
          .replace(/\&amp;/g, '&')
          .trim();
        
        // Convert "Heading X" to proper markdown headings
        content = content
          .replace(/^Heading\s+2\s*[:]*\s*(.*)/gim, '## $1')
          .replace(/^Heading\s+3\s*[:]*\s*(.*)/gim, '### $1');
        
        // Add extracted slide with source type
        slides.push({
          title,
          content,
          sourceType: 'notion'
        });
      }
      
      this.debug(`Extraction complete: ${slides.length} slides`);
      return slides;
    } catch (error) {
      loggingService.error('Error extracting content from Notion page', error);
      return [];
    }
  }
  
  /**
   * Process an element to markdown using the appropriate extractor
   * @param {Element} element - The element to process
   * @returns {string} - The markdown representation of the element
   */
  processElementToMarkdown(element) {
    // Process based on element type using Strategy pattern with extractors
    
    // 1. Headings (Level 2 & 3)
    if (this.headingExtractor.isHeadingElement(element, 2)) {
      return this.headingExtractor.headingToMarkdown(element, 2);
    } 
    else if (this.headingExtractor.isHeadingElement(element, 3)) {
      return this.headingExtractor.headingToMarkdown(element, 3);
    }
    
    // 2. Lists
    else if (this.listExtractor.isList(element)) {
      return this.listExtractor.listToMarkdown(element);
    }
    
    // 3. Code blocks
    else if (this.codeBlockExtractor.isCodeBlock(element)) {
      return this.codeBlockExtractor.codeBlockToMarkdown(element);
    }
    
    // 4. Tables
    else if (this.tableExtractor.isTableElement(element)) {
      return this.tableExtractor.tableToMarkdown(element);
    }
    
    // 5. Blockquotes
    else if (this.blockquoteExtractor.isBlockquote(element)) {
      return this.blockquoteExtractor.blockquoteToMarkdown(element);
    }
    
    // 6. Paragraphs with formatting
    else if (this.paragraphExtractor.isParagraph(element)) {
      return this.paragraphExtractor.paragraphToMarkdown(element);
    }
    
    // 7. Images
    else if (this.imageExtractor.isImage(element)) {
      return this.imageExtractor.imageToMarkdown(element);
    }
    
    // 8. Horizontal rule
    else if (element.tagName === 'HR' || this.hasClass(element, 'notion-divider-block')) {
      return '---';
    }
    
    // 9. Default case - get text content if it's not empty
    else {
      const text = this.getElementText(element);
      return text.trim() ? text : '';
    }
  }
  
  /**
   * Get content between two slide breaks
   * @param {Element} currentBreak - Current slide break element
   * @param {Element} nextBreak - Next slide break element or null
   * @returns {string} - Combined slide content as markdown
   */
  getContentBetweenBreaks(currentBreak, nextBreak) {
    try {
      // Markdown parts to collect
      let markdownParts = [];
      
      // Get all elements between the current break and next break
      let currentElement = currentBreak.nextElementSibling;
      while (currentElement && currentElement !== nextBreak) {
        const markdown = this.processElementToMarkdown(currentElement);
        
        if (markdown) {
          markdownParts.push(markdown);
        }
        
        currentElement = currentElement.nextElementSibling;
      }
      
      // Join all parts with double newlines for proper markdown spacing
      return markdownParts.join('\n\n');
    } catch (error) {
      loggingService.error('Error extracting content between breaks', error);
      return '';
    }
  }
}
