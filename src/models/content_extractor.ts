/**
 * Notion to Slides - Content Extractor
 * 
 * Main content extraction module that coordinates all specialized extractors
 */

import { loggingService } from '../services/logging_service';
import { 
  HeadingExtractor, 
  ListExtractor, 
  CodeBlockExtractor,
  TableExtractor,
  BlockquoteExtractor,
  ParagraphExtractor,
  ImageExtractor
} from './extractors/index.js';

export class ContentExtractor {
  private document: Document;
  private heading_extractor: HeadingExtractor;
  private list_extractor: ListExtractor;
  private code_block_extractor: CodeBlockExtractor;
  private table_extractor: TableExtractor;
  private blockquote_extractor: BlockquoteExtractor;
  private paragraph_extractor: ParagraphExtractor;
  private image_extractor: ImageExtractor;

  /**
   * Constructor for the content extractor
   * @param document - DOM document to extract from
   */
  constructor(document: Document) {
    this.document = document;
    
    // Initialize specialized extractors
    this.heading_extractor = new HeadingExtractor(document);
    this.list_extractor = new ListExtractor(document);
    this.code_block_extractor = new CodeBlockExtractor(document);
    this.table_extractor = new TableExtractor(document);
    this.blockquote_extractor = new BlockquoteExtractor(document);
    this.paragraph_extractor = new ParagraphExtractor(document);
    this.image_extractor = new ImageExtractor(document);
    
    loggingService.debug('Content extractor initialized');
  }
  
  /**
   * Main extraction method
   * @returns Array of markdown strings, one per slide
   */
  extract(): string[] {
    loggingService.debug('Starting content extraction');
    
    try {
      // Find all H1 headings to identify slide boundaries
      const h1Elements = this.heading_extractor.extractHeadingsOfLevel(1);
      
      if (h1Elements.length === 0) {
        loggingService.error('No H1 headings found. Template format requires H1 headings to define slides.');
        return [];
      }
      
      loggingService.debug(`Found ${h1Elements.length} H1 headings for slides`);
      
      const slides: string[] = [];
      
      // Process each H1 heading to create a slide
      h1Elements.forEach((h1, index) => {
        // Get the content for this slide - everything until the next H1 or end of document
        const nextH1 = h1Elements[index + 1] || null;
        const slideMarkdown = this.extractSlideContent(h1, nextH1);
        
        if (slideMarkdown.trim()) {
          slides.push(slideMarkdown);
        }
      });
      
      loggingService.debug(`Created ${slides.length} slides from template format`);
      
      // Debug output
      slides.forEach((slide, index) => {
        loggingService.debug(`Slide ${index + 1}:`, {
          length: slide.length,
          h1Count: (slide.match(/^# /gm) || []).length,
          h2Count: (slide.match(/^## /gm) || []).length,
          h3Count: (slide.match(/^### /gm) || []).length
        });
      });
      
      return slides;
    } catch (error) {
      loggingService.error('Error extracting content', error);
      throw error;
    }
  }
  
  /**
   * Extract content for a slide as markdown
   * @param h1Element - The H1 heading element for this slide
   * @param nextH1 - The next H1 heading element (or null if last slide)
   * @returns Markdown content for the slide
   */
  extractSlideContent(h1Element: Element, nextH1: Element | null): string {
    // Start with the H1 text as the slide title - format as markdown H1
    const title = (h1Element as HTMLElement).innerText.trim();
    let slideContent = `# ${title}`;
    
    // Get all subsequent elements until the next H1
    let currentElement = h1Element.nextElementSibling;
    
    // Process content until we reach the next H1 or run out of elements
    while (currentElement && currentElement !== nextH1) {
      // Skip empty elements
      if (!(currentElement as HTMLElement).innerText.trim()) {
        currentElement = currentElement.nextElementSibling;
        continue;
      }
      
      // Process element based on its type
      const elementContent = this.processElement(currentElement);
      
      // Add content if it exists and isn't duplicated
      if (elementContent && elementContent.trim() && !slideContent.includes(elementContent)) {
        slideContent += `\n\n${elementContent}`;
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    return slideContent;
  }
  
  /**
   * Process an element to extract its markdown content
   * @param element - The DOM element to process
   * @returns Markdown content or empty string
   */
  processElement(element: Element | null): string {
    // Skip elements without content
    if (!element || 
        !(element as HTMLElement).innerText || 
        !(element as HTMLElement).innerText.trim()) {
      return '';
    }
    
    // Check for headings (H2, H3)
    if (this.heading_extractor.isHeadingElement(element, 2)) {
      return this.heading_extractor.headingToMarkdown(element, 2);
    }
    
    if (this.heading_extractor.isHeadingElement(element, 3)) {
      return this.heading_extractor.headingToMarkdown(element, 3);
    }
    
    // Check for lists
    if (this.list_extractor.isList(element)) {
      return this.list_extractor.listToMarkdown(element);
    }
    
    // Check for code blocks
    if (this.code_block_extractor.isCodeBlock(element)) {
      return this.code_block_extractor.codeBlockToMarkdown(element);
    }
    
    // Check for tables
    if (this.table_extractor.isTableElement(element)) {
      return this.table_extractor.tableToMarkdown(element);
    }
    
    // Check for blockquotes
    if (this.blockquote_extractor.isBlockquote(element)) {
      return this.blockquote_extractor.blockquoteToMarkdown(element);
    }
    
    // Check for paragraphs with formatting
    if (this.paragraph_extractor.isParagraph(element)) {
      return this.paragraph_extractor.paragraphToMarkdown(element);
    }
    
    // Check for images
    if (this.image_extractor.isImage(element)) {
      return this.image_extractor.imageToMarkdown(element);
    }
    
    // Check for horizontal rule
    if (element.tagName === 'HR') {
      return '---';
    }
    
    // Default: treat as regular paragraph
    const text = (element as HTMLElement).innerText.trim();
    
    // Skip empty paragraphs or ones that look like markdown headings (to avoid duplication)
    if (!text || text.startsWith('#')) {
      return '';
    }
    
    // Check if this is actually a list item in a paragraph
    if (text.startsWith('-') || text.startsWith('*')) {
      // Single list item - just return as-is
      return text;
    }
    
    // Regular paragraph
    return text;
  }
}