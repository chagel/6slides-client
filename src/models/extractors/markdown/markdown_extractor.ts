/**
 * Six Slides - Markdown Extractor
 * 
 * Extracts content from Markdown files or rendered Markdown content
 */

import { loggingService } from '../../../services/logging_service';
import { BaseExtractor } from '../base_extractor';
import { IMarkdownExtractor } from './types';
import { Slide } from '../../../types/index';

/**
 * Slide object interface used internally by the extractor
 */
interface MarkdownSlide {
  title: string;
  content: string;
  sourceType: string;
  subslides?: MarkdownSlide[];
}

/**
 * Extracts content from Markdown files or rendered Markdown
 */
export class MarkdownExtractor extends BaseExtractor implements IMarkdownExtractor {
  /**
   * Constructor
   * @param document - The document to extract from
   */
  constructor(document: Document) {
    super(document);
  }
  
  /**
   * Extract content from Markdown
   * @returns Array of slide objects
   */
  extract(): Slide[] {
    try {
      this.debug('Starting extraction from Markdown');
      
      // Two extraction strategies:
      // 1. If it's a rendered markdown page (like GitHub), extract from the DOM
      // 2. If it's a raw markdown file, parse the text content
      
      // Detect if this is rendered markdown
      const markdownContainer = this.findMarkdownContainer();
      
      if (markdownContainer) {
        // It's rendered markdown (like GitHub)
        this.debug('Detected rendered markdown');
        return this.extractFromRenderedMarkdown(markdownContainer);
      } else {
        // It's likely raw markdown
        this.debug('Detected raw markdown');
        return this.extractFromRawMarkdown();
      }
    } catch (error) {
      loggingService.error('Error extracting content from Markdown', error);
      return [];
    }
  }
  
  /**
   * Find the container that holds rendered markdown content
   * @returns The markdown container or null
   */
  findMarkdownContainer(): Element | null {
    // Common markdown container classes
    const possibleContainers = [
      '.markdown-body', // GitHub
      '.md-content',    // GitLab
      '.markdown',      // Generic
      'article'         // Generic article
    ];
    
    for (const selector of possibleContainers) {
      const container = this.document.querySelector(selector);
      if (container) {
        return container;
      }
    }
    
    return null;
  }
  
  /**
   * Extract content from rendered markdown
   * @param container - The markdown container element
   * @returns Array of slide objects
   */
  extractFromRenderedMarkdown(container: Element): Slide[] {
    try {
      // Find all H1 elements (slide breaks)
      const slideBreaks = container.querySelectorAll('h1');
      this.debug(`Found ${slideBreaks.length} potential slides (H1 elements)`);
      
      if (slideBreaks.length === 0) {
        loggingService.error('No slide breaks (H1 elements) found in the markdown');
        return [];
      }
      
      const slides: MarkdownSlide[] = [];
      
      // Process each slide break
      for (let i = 0; i < slideBreaks.length; i++) {
        const currentBreak = slideBreaks[i];
        const nextBreak = i < slideBreaks.length - 1 ? slideBreaks[i + 1] : null;
        
        // Get slide title from the current break
        const title = this.getElementText(currentBreak);
        
        // Find all H2 elements between the current and next H1
        const subslideHeadings = this.findSubslideHeadings(currentBreak, nextBreak, container);
        
        if (subslideHeadings.length > 0) {
          // This slide has subslides
          this.debug(`Found ${subslideHeadings.length} potential subslides (H2 elements) for slide "${title}"`);
          
          // Extract content between the H1 and the first H2
          const mainSlideContent = this.extractContentBetweenHeadings(
            currentBreak, 
            subslideHeadings[0], 
            container
          );
          
          // Create the main slide
          const mainSlide: MarkdownSlide = {
            title: title.trim(),
            content: this.cleanMarkdown(mainSlideContent),
            sourceType: 'rendered-markdown',
            subslides: []
          };
          
          // Process each subslide
          for (let j = 0; j < subslideHeadings.length; j++) {
            const currentSubHeading = subslideHeadings[j];
            const nextSubHeading = j < subslideHeadings.length - 1 ? 
                                  subslideHeadings[j + 1] : 
                                  nextBreak;
            
            // Get subslide title
            const subslideTitle = this.getElementText(currentSubHeading);
            
            // Get content between current and next subheading (or next H1)
            const subslideContent = this.extractContentBetweenHeadings(
              currentSubHeading, 
              nextSubHeading, 
              container
            );
            
            // Add subslide
            mainSlide.subslides?.push({
              title: subslideTitle.trim(),
              content: this.cleanMarkdown(subslideContent),
              sourceType: 'rendered-markdown'
            });
          }
          
          slides.push(mainSlide);
        } else {
          // No subslides - handle as a regular slide
          const rawContent = this.extractContentBetweenHeadings(currentBreak, nextBreak, container);
          const content = this.cleanMarkdown(rawContent);
          
          slides.push({
            title: title.trim(),
            content,
            sourceType: 'rendered-markdown'
          });
        }
      }
      
      this.debug(`Extracted ${slides.length} slides from rendered markdown`);
      return slides;
    } catch (error) {
      loggingService.error('Error extracting from rendered markdown', error);
      return [];
    }
  }
  
  /**
   * Find all H2 elements between two headings
   * @param startHeading - The starting heading element (H1)
   * @param endHeading - The ending heading element (next H1) or null
   * @param container - Parent container
   * @returns Array of H2 elements
   */
  findSubslideHeadings(startHeading: Element, endHeading: Element | null, container: Element): Element[] {
    const subslideHeadings: Element[] = [];
    let currentElement = startHeading.nextElementSibling;
    
    while (currentElement && 
          currentElement !== endHeading && 
          container.contains(currentElement)) {
      
      if (currentElement.tagName.toLowerCase() === 'h2') {
        subslideHeadings.push(currentElement);
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    return subslideHeadings;
  }
  
  /**
   * Extract markdown content between headings
   * @param currentHeading - Current heading element
   * @param nextHeading - Next heading element or null
   * @param container - Parent container
   * @returns Markdown content
   */
  extractContentBetweenHeadings(currentHeading: Element, nextHeading: Element | null, container: Element): string {
    const markdownParts: string[] = [];
    let currentElement = currentHeading.nextElementSibling;
    
    while (currentElement && 
          currentElement !== nextHeading && 
          container.contains(currentElement)) {
      
      const tagName = currentElement.tagName.toLowerCase();
      
      // Convert each element to markdown
      if (tagName === 'h2') {
        markdownParts.push('## ' + this.getElementText(currentElement));
      }
      else if (tagName === 'h3') {
        markdownParts.push('### ' + this.getElementText(currentElement));
      }
      else if (tagName === 'h4') {
        markdownParts.push('#### ' + this.getElementText(currentElement));
      }
      else if (tagName === 'ul' || tagName === 'ol') {
        // Lists
        const items = currentElement.querySelectorAll('li');
        const isOrdered = tagName === 'ol';
        const listItems: string[] = [];
        
        items.forEach((item, index) => {
          if (isOrdered) {
            listItems.push(`${index + 1}. ${this.getElementText(item)}`);
          } else {
            listItems.push(`- ${this.getElementText(item)}`);
          }
        });
        
        markdownParts.push(listItems.join('\n'));
      }
      else if (tagName === 'pre' || tagName === 'code' || 
              currentElement.querySelector('pre') || currentElement.querySelector('code')) {
        // Code blocks
        const preElement = tagName === 'pre' ? currentElement : currentElement.querySelector('pre');
        const codeElement = preElement ? preElement.querySelector('code') : 
                          (tagName === 'code' ? currentElement : currentElement.querySelector('code'));
                          
        let codeText = '';
        if (codeElement) {
          codeText = this.getElementText(codeElement);
        } else if (preElement) {
          codeText = this.getElementText(preElement);
        } else {
          codeText = this.getElementText(currentElement);
        }
        
        // Detect language from class
        let language = '';
        if (codeElement && codeElement.className) {
          const match = codeElement.className.match(/language-([a-z0-9]+)/i);
          if (match && match[1]) {
            language = match[1];
          }
        }
        
        markdownParts.push("```" + language + "\n" + codeText + "\n```");
      }
      else if (tagName === 'blockquote') {
        // Blockquotes
        const lines = this.getElementText(currentElement).split('\n');
        const quotedLines = lines.map(line => `> ${line}`);
        markdownParts.push(quotedLines.join('\n'));
      }
      else if (tagName === 'table') {
        // Tables
        markdownParts.push(this.convertTableToMarkdown(currentElement));
      }
      else if (tagName === 'p') {
        // Paragraphs
        markdownParts.push(this.getElementText(currentElement));
      }
      else if (tagName === 'img' || currentElement.querySelector('img')) {
        // Images
        const img = tagName === 'img' ? 
                    currentElement as HTMLImageElement : 
                    currentElement.querySelector('img') as HTMLImageElement | null;
        if (img && img.src) {
          const alt = img.alt || 'Image';
          markdownParts.push(`![${alt}](${img.src})`);
        }
      }
      else if (tagName === 'hr') {
        // Horizontal rule
        markdownParts.push('---');
      }
      else {
        // Other elements - try to get text
        const text = this.getElementText(currentElement);
        if (text.trim()) {
          markdownParts.push(text);
        }
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    return markdownParts.join('\n\n');
  }
  
  /**
   * Convert a table element to markdown
   * @param table - Table element
   * @returns Markdown table
   */
  convertTableToMarkdown(table: Element): string {
    try {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (!rows.length) return '';
      
      const markdownRows: string[] = [];
      
      // Process header row
      const headerRow = rows[0];
      const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
      if (!headerCells.length) return '';
      
      markdownRows.push('| ' + headerCells.map(cell => this.getElementText(cell)).join(' | ') + ' |');
      
      // Add separator row
      markdownRows.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
      
      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length) {
          markdownRows.push('| ' + cells.map(cell => this.getElementText(cell)).join(' | ') + ' |');
        }
      }
      
      return markdownRows.join('\n');
    } catch (error) {
      loggingService.error('Error converting table to markdown', error);
      return '';
    }
  }
  
  /**
   * Extract content from raw markdown text
   * @returns Array of slide objects
   */
  extractFromRawMarkdown(): Slide[] {
    try {
      // Get raw markdown content from the page
      const bodyElement = this.document.body as HTMLBodyElement;
      const rawMarkdown = bodyElement.innerText;
      
      // Clean the raw markdown to ensure it's properly formatted
      const cleanedMarkdown = this.cleanMarkdown(rawMarkdown);
      
      // Split the markdown by H1 headings (# heading)
      const slideSegments = cleanedMarkdown.split(/^#\s+(.+)$/m);
      
      // Process segments into slides
      const slides: MarkdownSlide[] = [];
      
      // First segment is before any headings
      // Skip it unless it has meaningful content
      let startIndex = 0;
      if (slideSegments.length > 0 && !slideSegments[0].trim().startsWith('#')) {
        startIndex = 1;
      }
      
      // Process each segment (heading + content)
      for (let i = startIndex; i < slideSegments.length; i += 2) {
        if (i + 1 >= slideSegments.length) break;
        
        const title = slideSegments[i].trim();
        const content = slideSegments[i + 1].trim();
        
        // Check for H2 headings within this content (subslides)
        const h2Pattern = /^##\s+(.+)$/gm;
        const h2Matches = [...content.matchAll(h2Pattern)];
        
        if (h2Matches.length > 0) {
          // This slide has subslides
          this.debug(`Found ${h2Matches.length} potential subslides (H2 headings) for slide "${title}"`);
          
          // Find the index of the first H2 heading
          const firstH2Index = content.indexOf('## ');
          
          // Extract content before the first H2 heading
          const mainContent = firstH2Index > 0 ? content.substring(0, firstH2Index).trim() : '';
          
          // Create the main slide with subslides
          const mainSlide: MarkdownSlide = {
            title,
            content: this.cleanMarkdown(mainContent),
            sourceType: 'raw-markdown',
            subslides: []
          };
          
          // Split content by H2 headings
          const subslideSegments = content.split(/^##\s+(.+)$/m);
          
          // Process subslide segments
          // Skip the first segment (content before first H2)
          for (let j = 1; j < subslideSegments.length; j += 2) {
            if (j + 1 >= subslideSegments.length) break;
            
            const subslideTitle = subslideSegments[j].trim();
            const subslideContent = subslideSegments[j + 1].trim();
            
            mainSlide.subslides?.push({
              title: subslideTitle,
              content: this.cleanMarkdown(subslideContent),
              sourceType: 'raw-markdown'
            });
          }
          
          slides.push(mainSlide);
        } else {
          // No subslides
          slides.push({
            title,
            content,
            sourceType: 'raw-markdown'
          });
        }
      }
      
      // If no slides were found using the heading approach, try alternative approach
      if (slides.length === 0) {
        this.debug('No slides found using standard markdown parsing, trying alternative approach');
        return this.parseAlternativeMarkdownFormat(cleanedMarkdown);
      }
      
      // Process and clean up all slides
      const processedSlides = slides.map(slide => {
        if (Array.isArray(slide.subslides)) {
          // Slide with subslides
          return {
            ...slide,
            title: slide.title.trim(),
            content: this.cleanMarkdown(slide.content),
            subslides: slide.subslides.map(subslide => ({
              ...subslide,
              title: subslide.title.trim(),
              content: this.cleanMarkdown(subslide.content)
            }))
          };
        } else {
          // Regular slide
          return {
            ...slide,
            title: slide.title.trim(),
            content: this.cleanMarkdown(slide.content)
          };
        }
      });
      
      return processedSlides;
    } catch (error) {
      loggingService.error('Error extracting from raw markdown', error);
      return [{
        title: 'Parsing Error',
        content: 'Failed to parse markdown content.',
        sourceType: 'error'
      }];
    }
  }
  
  /**
   * Clean and normalize markdown content for reveal.js
   * @param markdown - Raw markdown content
   * @returns Cleaned markdown content
   */
  cleanMarkdown(markdown: string): string {
    if (!markdown) return '';
    
    return markdown
      .replace(/\n{3,}/g, '\n\n')       // Replace 3+ consecutive newlines with 2
      .replace(/&nbsp;/g, ' ')          // Replace HTML non-breaking spaces
      .replace(/&lt;/g, '<')            // Decode HTML entities that might be present
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\\"/g, '"')             // Remove unnecessary escape sequences
      .replace(/\\'/g, "'")
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .trim();
  }
  
  /**
   * Try alternative markdown parsing approaches
   * @param rawMarkdown - Raw markdown content
   * @returns Array of slide objects
   */
  parseAlternativeMarkdownFormat(rawMarkdown: string): MarkdownSlide[] {
    // Try to find slide separators like --- or ---, which are commonly used in markdown slide tools
    const slideDelimiters = [
      /\n---\n/g,
      /\n----\n/g,
      /\n\*\*\*\n/g,
      /\n\n---\n\n/g,
      /\n\n----\n\n/g,
      /<!--\s*slide\s*-->/gi,
      /<!--\s*next\s*-->/gi
    ];
    
    for (const delimiter of slideDelimiters) {
      const segments = rawMarkdown.split(delimiter);
      
      if (segments.length > 1) {
        this.debug(`Found slide delimiter: ${delimiter}`);
        
        return segments.map((segment, index) => {
          const content = this.cleanMarkdown(segment);
          
          // Try to extract a title from the first heading in the segment
          let title = `Slide ${index + 1}`;
          const titleMatch = content.match(/^#+\s+(.+)$/m);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
          
          // Check for H2 headings (subslides)
          const h2Pattern = /^##\s+(.+)$/gm;
          const h2Matches = [...content.matchAll(h2Pattern)];
          
          if (h2Matches.length > 0) {
            // This slide has subslides
            this.debug(`Found ${h2Matches.length} potential subslides (H2 headings) for slide "${title}"`);
            
            // Find the index of the first H2 heading
            const firstH2Index = content.indexOf('## ');
            
            // Extract content before the first H2 heading
            const mainContent = firstH2Index > 0 ? content.substring(0, firstH2Index).trim() : '';
            
            // Create the main slide with subslides
            const slide: MarkdownSlide = {
              title,
              content: this.cleanMarkdown(mainContent),
              sourceType: 'raw-markdown',
              subslides: []
            };
            
            // Split content by H2 headings
            const subslideSegments = content.split(/^##\s+(.+)$/m);
            
            // Process subslide segments
            // Skip the first segment (content before first H2)
            for (let j = 1; j < subslideSegments.length; j += 2) {
              if (j + 1 >= subslideSegments.length) break;
              
              const subslideTitle = subslideSegments[j].trim();
              const subslideContent = subslideSegments[j + 1].trim();
              
              slide.subslides?.push({
                title: subslideTitle,
                content: this.cleanMarkdown(subslideContent),
                sourceType: 'raw-markdown'
              });
            }
            
            return slide;
          } else {
            // No subslides
            return {
              title,
              content,
              sourceType: 'raw-markdown'
            };
          }
        });
      }
    }
    
    // If no delimiter was found, create a single slide with all content
    // Check for H2 headings in the single slide
    const h2Pattern = /^##\s+(.+)$/gm;
    const h2Matches = [...rawMarkdown.matchAll(h2Pattern)];
    
    if (h2Matches.length > 0) {
      // There are H2 headings in the single slide
      // Try to extract a title from the first H1 heading
      let title = 'Presentation';
      const titleMatch = rawMarkdown.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
      
      // Find the index of the first H2 heading
      const firstH2Index = rawMarkdown.indexOf('## ');
      
      // Extract content before the first H2 heading
      let mainContent = '';
      if (firstH2Index > 0) {
        // If there's an H1 heading, start after that
        const h1Match = rawMarkdown.match(/^#\s+(.+)$/m);
        if (h1Match && h1Match.index !== undefined) {
          const h1EndIndex = h1Match.index + h1Match[0].length;
          mainContent = rawMarkdown.substring(h1EndIndex, firstH2Index).trim();
        } else {
          mainContent = rawMarkdown.substring(0, firstH2Index).trim();
        }
      }
      
      // Create the main slide with subslides
      const slide: MarkdownSlide = {
        title,
        content: this.cleanMarkdown(mainContent),
        sourceType: 'raw-markdown',
        subslides: []
      };
      
      // Split content by H2 headings
      const subslideSegments = rawMarkdown.split(/^##\s+(.+)$/m);
      
      // Process subslide segments
      // Skip the first segment (content before first H2)
      for (let j = 1; j < subslideSegments.length; j += 2) {
        if (j + 1 >= subslideSegments.length) break;
        
        const subslideTitle = subslideSegments[j].trim();
        const subslideContent = subslideSegments[j + 1].trim();
        
        slide.subslides?.push({
          title: subslideTitle,
          content: this.cleanMarkdown(subslideContent),
          sourceType: 'raw-markdown'
        });
      }
      
      return [slide];
    }
    
    // No H2 headings, create a single simple slide
    return [{
      title: 'Presentation',
      content: this.cleanMarkdown(rawMarkdown),
      sourceType: 'raw-markdown'
    }];
  }
}