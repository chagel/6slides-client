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
    // Find all H1 elements (slide breaks)
    const slideBreaks = this.findElements('h1, .notion-header-block');
    
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
      
      // Find H2 elements between the current and next H1 (for subslides)
      const subslideHeadings = this.subslide_extractor.findSubslideHeadings(currentBreak, nextBreak);
      
      if (subslideHeadings.length > 0) {
        // Create main slide content (content before the first H2)
        const mainContent = this.getContentBetweenElements(currentBreak, subslideHeadings[0]);
        const cleanedMainContent = this.cleanContent(mainContent);
        
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
        let content = this.getContentBetweenElements(currentBreak, nextBreak);
        content = this.cleanContent(content);
        
        slides.push({
          title,
          content,
          sourceType: 'notion'
        });
      }
    }
    
    return slides;
  }
  
  /**
   * Clean and normalize content
   * @param content - Raw content to clean
   * @returns Cleaned content
   */
  cleanContent(content: string): string {
    const htmlEntities = {
      '&nbsp;': ' ',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&amp;': '&'
    };

    // Clean up HTML entities and normalize content in one pass
    content = content.trim()
      // Replace 3+ consecutive newlines with 2
      .replace(/\n{3,}/g, '\n\n')
      // Replace all HTML entities at once
      .replace(/&nbsp;|&lt;|&gt;|&quot;|&amp;/g, match => htmlEntities[match as keyof typeof htmlEntities])
      // Convert "Heading X" to proper markdown headings in one regex
      .replace(/^Heading\s+([23])\s*[:]*\s*(.*)/gim, (_, level, text) => `${'#'.repeat(Number(level))} ${text}`);
    
    return content;
  }
  
  /**
   * Extract content between two elements in the DOM
   * @param startElement Starting element (content after this)
   * @param endElement Ending element (content up to but not including this)
   * @returns Markdown content
   */
  getContentBetweenElements(startElement: Element, endElement: Element | null): string {
    // Check if the start element is a subheading
    const isStartElementSubheading = this.subslide_extractor.isSubslideHeading(startElement);
    
    // Markdown parts to collect
    const markdownParts: string[] = [];
    
    // Skip the start element itself and start with next sibling
    let currentElement = startElement.nextElementSibling;
    
    while (currentElement && currentElement !== endElement) {
      // Skip nested subheadings when processing a subslide
      if (isStartElementSubheading && 
          this.subslide_extractor.isSubslideHeading(currentElement)) {
        // Skip any nested H2 elements when inside a subslide
        currentElement = currentElement.nextElementSibling;
        continue;
      }
      
      // For list items, we need to process the element AND its children
      // to handle nested structures properly
      if (this.list_extractor.isList(currentElement)) {
        const markdown = this.processElementAndChildren(currentElement);
        if (markdown) {
          markdownParts.push(markdown);
        }
        
        // After processing a list element with its children, move to next sibling
        currentElement = currentElement.nextElementSibling;
        continue;
      }
      
      // For non-list elements, process normally
      const markdown = this.processElementToMarkdown(currentElement);
      
      if (markdown) {
        markdownParts.push(markdown);
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    // Process the parts to preserve list formatting
    return this.processMarkdownParts(markdownParts);
  }
  
  /**
   * Process markdown parts and preserve proper formatting for lists
   * @param markdownParts Array of markdown content fragments
   * @returns Formatted markdown content
   */
  private processMarkdownParts(markdownParts: string[]): string {
    const processedParts = [];
    let currentListGroup = [];
    
    for (const part of markdownParts) {
      // Check if this part contains a list item (including indented list items)
      const isListPart = part.trim().startsWith('- ') || 
                        part.trim().startsWith('1. ') || 
                        /^\s+- /.test(part) || 
                        /^\s+\d+\. /.test(part);
      
      if (isListPart) {
        // This is a list item, add to current group
        currentListGroup.push(part);
      } else {
        // Not a list item
        if (currentListGroup.length > 0) {
          // Finish the previous list group with single newlines
          processedParts.push(currentListGroup.join('\n'));
          currentListGroup = [];
        }
        // Add this non-list part
        processedParts.push(part);
      }
    }
    
    // Handle any remaining list group
    if (currentListGroup.length > 0) {
      processedParts.push(currentListGroup.join('\n'));
    }
    
    // Join the processed parts with double newlines
    return processedParts.join('\n\n');
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
   * Extract text directly from an element, excluding text from child elements
   * @param element Element to extract text from
   * @returns Direct text content
   */
  getDirectTextContent(element: Element): string {
    // For list items, use the list extractor's specialized method
    if (this.list_extractor.isList(element)) {
      return this.list_extractor.getDirectListText(element);
    }
    
    // First try to find a contenteditable leaf element (specific to Notion)
    const editableLeaf = element.querySelector('[data-content-editable-leaf="true"]');
    if (editableLeaf && editableLeaf.textContent) {
      return editableLeaf.textContent.trim();
    }
    
    // Direct text nodes approach
    let directText = '';
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent || '';
      }
    }
    
    // If we found direct text, return it
    if (directText.trim()) {
      return directText.trim();
    }
    
    // Final fallback - get text content and remove child list text
    let text = element.textContent || '';
    for (const child of Array.from(element.children)) {
      if (this.list_extractor.isList(child as Element)) {
        text = text.replace(child.textContent || '', '');
      }
    }
    
    return text.trim();
  }
  
  /**
   * Process an element and its children recursively
   * This is critical for handling nested elements like lists properly
   * @param element The element to process
   * @returns Markdown for this element and all its children
   */
  processElementAndChildren(element: Element): string {
    // For list elements, we need special handling for nested structure
    if (this.list_extractor.isList(element)) {
      // Get the indentation level for this list item
      const level = this.list_extractor.getIndentationLevel(element);
      
      // Get only the direct text of this element (not including children)
      const text = this.getDirectTextContent(element);
      
      // Skip empty list items
      if (!text) {
        return '';
      }
      
      // Format as markdown with correct indentation
      const indent = '  '.repeat(level); // Two spaces per level
      const marker = this.list_extractor.isOrderedListItem(element) ? '1.' : '-';
      const markdown = `${indent}${marker} ${text}`;
      
      // Find all nested list items
      const childLists = this.findNestedListItems(element);
      
      // Process child list items
      const childrenMarkdown = childLists
        .map(child => this.processElementAndChildren(child))
        .filter(md => this.isNonEmptyListItem(md));
      
      // If we have child content, join it with the parent
      if (childrenMarkdown.length > 0) {
        return [markdown, ...childrenMarkdown].join('\n');
      }
      
      return markdown;
    } else {
      // For non-list elements, use the normal processing
      return this.processElementToMarkdown(element) || '';
    }
  }
  
  /**
   * Find all nested list items within a parent element
   * @param parent Parent element to search in
   * @returns Array of list elements
   */
  private findNestedListItems(parent: Element): Element[] {
    // Find all list elements within the parent, excluding the parent itself
    const nestedSelectors = [
      '.notion-bulleted_list-block', 
      '.notion-numbered_list-block',
      '.notion-to_do-block',
      '.notion-toggle-block',
      '.notion-list-block'
    ].join(',');
    
    // Get all potential list items
    const allNestedElements = Array.from(parent.querySelectorAll(nestedSelectors));
    
    // Filter to only include direct descendants
    return allNestedElements.filter(el => {
      if (el === parent) return false;
      
      // Check if this element is a descendant of the parent
      let currentParent = el.parentElement;
      while (currentParent) {
        // If we find the parent element before document.body, it's a descendant
        if (currentParent === parent) return true;
        if (currentParent === document.body) return false;
        currentParent = currentParent.parentElement;
      }
      return false;
    });
  }
  
  /**
   * Check if a list item has meaningful content
   * @param markdown Markdown string to check
   * @returns true if the list item has content beyond just a marker
   */
  private isNonEmptyListItem(markdown: string): boolean {
    if (!markdown) return false;
    
    const trimmed = markdown.trim();
    // Check for various empty list item patterns
    return !(
      trimmed === '-' || 
      trimmed === '- ' || 
      trimmed.match(/^\s*-\s*$/) ||
      trimmed.match(/^\s*\d+\.\s*$/) ||
      trimmed.match(/^\s+\s*-\s*$/)
    );
  }
  
  
  // Class end
}
