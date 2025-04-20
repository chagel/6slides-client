/**
 * Six Slides - Notion Extractor
 * 
 * Extracts content from Notion pages
 */

import { loggingService } from '../../../services/logging_service';
import { BaseExtractor } from '../base_extractor';
import { HeadingExtractor } from './heading_extractor';
import { ListExtractor } from './list_extractor';
import { CodeBlockExtractor } from './code_block_extractor';
import { TableExtractor } from './table_extractor';
import { BlockquoteExtractor } from './blockquote_extractor';
import { ParagraphExtractor } from './paragraph_extractor';
import { ImageExtractor } from './image_extractor';
import { 
  IHeadingExtractor, 
  IListExtractor, 
  ICodeBlockExtractor,
  ITableExtractor,
  IBlockquoteExtractor,
  IParagraphExtractor,
  IImageExtractor
} from './types.js';
import { Slide } from '../../../types/index';

/**
 * Extracts content from Notion pages
 */
export class NotionExtractor extends BaseExtractor {
  heading_extractor: IHeadingExtractor;
  list_extractor: IListExtractor;
  code_block_extractor: ICodeBlockExtractor;
  table_extractor: ITableExtractor;
  blockquote_extractor: IBlockquoteExtractor;
  paragraph_extractor: IParagraphExtractor;
  image_extractor: IImageExtractor;

  /**
   * Constructor
   * @param document - The document to extract from
   */
  constructor(document: Document) {
    super(document);
    
    // Initialize component extractors
    this.heading_extractor = new HeadingExtractor(document);
    this.list_extractor = new ListExtractor(document);
    this.code_block_extractor = new CodeBlockExtractor(document);
    this.table_extractor = new TableExtractor(document);
    this.blockquote_extractor = new BlockquoteExtractor(document);
    this.paragraph_extractor = new ParagraphExtractor(document);
    this.image_extractor = new ImageExtractor(document);
  }
  
  /**
   * Extract content from Notion page
   * @returns Array of slide objects
   */
  extract(): Slide[] {
    try {
      this.debug('Starting extraction from Notion page');
      
      // Find all H1 elements (slide breaks)
      const slideBreaks = this.findElements('h1, .notion-header-block');
      this.debug(`Found ${slideBreaks.length} potential slides (H1 elements)`);
      
      if (slideBreaks.length === 0) {
        loggingService.error('No slide breaks (H1 elements) found in the document');
        return [];
      }
      
      const slides: Slide[] = [];
      
      // Process each slide break
      for (let i = 0; i < slideBreaks.length; i++) {
        const currentBreak = slideBreaks[i];
        const nextBreak = slideBreaks[i + 1];
        
        // Get slide title from the current break
        const title = this.getElementText(currentBreak).trim();
        
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
   * @param element - The element to process
   * @returns The markdown representation of the element
   */
  processElementToMarkdown(element: Element): string {
    // Process based on element type using Strategy pattern with extractors
    
    // 1. Headings (Level 2 & 3)
    if (this.heading_extractor.isHeadingElement(element, 2)) {
      return this.heading_extractor.headingToMarkdown(element, 2);
    } 
    else if (this.heading_extractor.isHeadingElement(element, 3)) {
      return this.heading_extractor.headingToMarkdown(element, 3);
    }
    
    // 2. Lists
    else if (this.list_extractor.isList(element)) {
      return this.list_extractor.listToMarkdown(element);
    }
    
    // 3. Code blocks
    else if (this.code_block_extractor.isCodeBlock(element)) {
      return this.code_block_extractor.codeBlockToMarkdown(element);
    }
    
    // 4. Tables
    else if (this.table_extractor.isTableElement(element)) {
      return this.table_extractor.tableToMarkdown(element);
    }
    
    // 5. Blockquotes
    else if (this.blockquote_extractor.isBlockquote(element)) {
      return this.blockquote_extractor.blockquoteToMarkdown(element);
    }
    
    // 6. Paragraphs with formatting
    else if (this.paragraph_extractor.isParagraph(element)) {
      return this.paragraph_extractor.paragraphToMarkdown(element);
    }
    
    // 7. Images
    else if (this.image_extractor.isImage(element)) {
      return this.image_extractor.imageToMarkdown(element);
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
   * @param currentBreak - Current slide break element
   * @param nextBreak - Next slide break element or null
   * @returns Combined slide content as markdown
   */
  getContentBetweenBreaks(currentBreak: Element, nextBreak: Element | null): string {
    try {
      // Markdown parts to collect
      const markdownParts: string[] = [];
      
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