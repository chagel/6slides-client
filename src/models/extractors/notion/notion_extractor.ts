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
import { SubslideExtractor } from './subslide_extractor';
import { 
  IHeadingExtractor, 
  IListExtractor, 
  ICodeBlockExtractor,
  ITableExtractor,
  IBlockquoteExtractor,
  IParagraphExtractor,
  IImageExtractor,
  ISubslideExtractor
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
  subslide_extractor: ISubslideExtractor;

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
    this.subslide_extractor = new SubslideExtractor(document);
  }
  
  /**
   * Extract content from Notion page
   * @returns Array of slide objects
   */
  extract(): Slide[] {
    try {
      loggingService.debug('Starting extraction from Notion page');
      
      // Find all H1 elements (slide breaks)
      const slideBreaks = this.findElements('h1, .notion-header-block');
      loggingService.debug(`Found ${slideBreaks.length} potential slides (H1 elements)`);
      
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
        loggingService.debug(`Processing slide ${i+1}: "${title}"`);
        
        // Find H2 elements between the current and next H1 (for subslides)
        const subslideHeadings = this.subslide_extractor.findSubslideHeadings(currentBreak, nextBreak);
        
        if (subslideHeadings.length > 0) {
          // This slide has subslides
          loggingService.debug(`Found ${subslideHeadings.length} subslides for slide "${title}"`);
          
          // Create main slide content (content before the first H2)
          const mainContent = this.getContentBetweenElements(currentBreak, subslideHeadings[0]);
          const cleanedMainContent = this.cleanContent(mainContent);
          
          loggingService.debug(`Main slide content summary`, {
            rawLength: mainContent.length,
            cleanedLength: cleanedMainContent.length
          });
          
          // Create the main slide with subslides
          const slide: Slide = {
            title,
            content: cleanedMainContent,
            sourceType: 'notion',
            subslides: []
          };
          
          // Process each subslide
          for (let j = 0; j < subslideHeadings.length; j++) {
            const currentSubHeading = subslideHeadings[j];
            const nextSubHeading = (j < subslideHeadings.length - 1) ? 
                                  subslideHeadings[j + 1] : 
                                  nextBreak;
            
            // Get subslide title from the H2 using the specialized extractor
            const subslideTitle = this.subslide_extractor.getSubslideTitle(currentSubHeading);
            
            // Get content between current H2 and next H2 or H1
            let subslideContent = this.getContentBetweenElements(currentSubHeading, nextSubHeading);
            subslideContent = this.cleanContent(subslideContent);
            
            // Add subslide
            slide.subslides?.push({
              title: subslideTitle,
              content: subslideContent,
              sourceType: 'notion'
            });
          }
          
          slides.push(slide);
        } else {
          // No subslides - handle as a regular slide
          loggingService.debug(`No subslides found for slide "${title}", processing as regular slide`);
          let content = this.getContentBetweenBreaks(currentBreak, nextBreak);
          content = this.cleanContent(content);
          
          loggingService.debug(`Regular slide content summary`, {
            contentLength: content.length
          });
          
          slides.push({
            title,
            content,
            sourceType: 'notion'
          });
        }
      }
      
      // Final extraction summary focused on subslides  
      loggingService.debug(`Extraction complete: ${slides.length} slides with ${slides.reduce((count, slide) => count + (slide.subslides?.length || 0), 0)} total subslides`);
      
      return slides;
    } catch (error) {
      loggingService.error('Error extracting content from Notion page', error);
      return [];
    }
  }
  
  /**
   * Clean and normalize content
   * @param content - Raw content to clean
   * @returns Cleaned content
   */
  cleanContent(content: string): string {
    // Clean up HTML entities and normalize content
    content = content
      .replace(/\n{3,}/g, '\n\n')     // Replace 3+ consecutive newlines with 2
      .replace(/&nbsp;/g, ' ')        // Replace HTML non-breaking spaces
      .replace(/&lt;/g, '<')          // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();
    
    // Convert "Heading X" to proper markdown headings
    content = content
      .replace(/^Heading\s+2\s*[:]*\s*(.*)/gim, '## $1')
      .replace(/^Heading\s+3\s*[:]*\s*(.*)/gim, '### $1');
    
    return content;
  }
  
  /**
   * Get content between two elements
   * @param startElement - Starting element
   * @param endElement - Ending element or null
   * @returns Combined content as markdown
   */
  getContentBetweenElements(startElement: Element, endElement: Element | null): string {
    try {
      // Simplified debug of content extraction
      
      // Check if the start element is a subheading
      const isStartElementSubheading = this.subslide_extractor.isSubslideHeading(startElement);
      
      // Markdown parts to collect
      const markdownParts: string[] = [];
      
      // Skip the start element itself and start with next sibling
      let currentElement = startElement.nextElementSibling;
      
      // Starting element scan removed for cleaner logs
      
      let elementsProcessed = 0;
      let elementsIncluded = 0;
      
      while (currentElement && currentElement !== endElement) {
        elementsProcessed++;
        
        // Simplified element processing logs
        
        // Skip nested subheadings when processing a subslide
        if (isStartElementSubheading && 
            this.subslide_extractor.isSubslideHeading(currentElement)) {
          // Skip any nested H2 elements when inside a subslide
          loggingService.debug('Skipping nested subheading');
          currentElement = currentElement.nextElementSibling;
          continue;
        }
        
        const markdown = this.processElementToMarkdown(currentElement);
        
        if (markdown) {
          markdownParts.push(markdown);
          elementsIncluded++;
          
          // We've removed detailed content logging
        } else {
          // Empty content handling
        }
        
        currentElement = currentElement.nextElementSibling;
      }
      
      // Join all parts with double newlines for proper markdown spacing
      const result = markdownParts.join('\n\n');
      
      // Simplified content extraction summary
      loggingService.debug('Content extraction complete', {
        elementsProcessed,
        elementsIncluded,
        contentLength: result.length
      });
      
      return result;
    } catch (error) {
      loggingService.error('Error extracting content between elements', error);
      return '';
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
    
    // 8. Horizontal rule - Skip these elements
    else if (element.tagName === 'HR' || this.hasClass(element, 'notion-divider-block')) {
      // Return empty string to omit horizontal dividers from the content
      return '';
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
