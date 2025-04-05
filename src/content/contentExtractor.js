/**
 * Notion to Slides - Content Extractor
 * 
 * Main content extraction module that coordinates all specialized extractors
 */

import { logDebug, logError } from '../common/utils.js';
import { HeadingExtractor, ListExtractor, CodeBlockExtractor } from './extractors/index.js';

export class ContentExtractor {
  /**
   * Constructor for the content extractor
   * @param {Document} document - DOM document to extract from
   */
  constructor(document) {
    this.document = document;
    
    // Initialize specialized extractors
    this.headingExtractor = new HeadingExtractor(document);
    this.listExtractor = new ListExtractor(document);
    this.codeBlockExtractor = new CodeBlockExtractor(document);
    
    logDebug('Content extractor initialized');
  }
  
  /**
   * Main extraction method
   * @returns {string[]} - Array of markdown strings, one per slide
   */
  extract() {
    logDebug('Starting content extraction');
    
    try {
      // Find all H1 headings to identify slide boundaries
      const h1Elements = this.headingExtractor.extractHeadingsOfLevel(1);
      
      if (h1Elements.length === 0) {
        logError('No H1 headings found. Template format requires H1 headings to define slides.');
        return [];
      }
      
      logDebug(`Found ${h1Elements.length} H1 headings for slides`);
      
      const slides = [];
      
      // Process each H1 heading to create a slide
      h1Elements.forEach((h1, index) => {
        // Get the content for this slide - everything until the next H1 or end of document
        const nextH1 = h1Elements[index + 1] || null;
        const slideMarkdown = this.extractSlideContent(h1, nextH1);
        
        if (slideMarkdown.trim()) {
          slides.push(slideMarkdown);
        }
      });
      
      logDebug(`Created ${slides.length} slides from template format`);
      
      // Debug output
      slides.forEach((slide, index) => {
        logDebug(`Slide ${index + 1}:`, {
          length: slide.length,
          h1Count: (slide.match(/^# /gm) || []).length,
          h2Count: (slide.match(/^## /gm) || []).length,
          h3Count: (slide.match(/^### /gm) || []).length
        });
      });
      
      return slides;
    } catch (error) {
      logError('Error extracting content', error);
      throw error;
    }
  }
  
  /**
   * Extract content for a slide as markdown
   * @param {Element} h1Element - The H1 heading element for this slide
   * @param {Element|null} nextH1 - The next H1 heading element (or null if last slide)
   * @returns {string} - Markdown content for the slide
   */
  extractSlideContent(h1Element, nextH1) {
    // Start with the H1 text as the slide title - format as markdown H1
    const title = h1Element.innerText.trim();
    let slideContent = `# ${title}`;
    
    // Get all subsequent elements until the next H1
    let currentElement = h1Element.nextElementSibling;
    
    // Process content until we reach the next H1 or run out of elements
    while (currentElement && currentElement !== nextH1) {
      // Skip empty elements
      if (!currentElement.innerText.trim()) {
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
   * @param {Element} element - The DOM element to process
   * @returns {string} - Markdown content or empty string
   */
  processElement(element) {
    // Skip elements without content
    if (!element || !element.innerText || !element.innerText.trim()) {
      return '';
    }
    
    // Check for headings (H2, H3)
    if (this.headingExtractor.isHeadingElement(element, 2)) {
      return this.headingExtractor.headingToMarkdown(element, 2);
    }
    
    if (this.headingExtractor.isHeadingElement(element, 3)) {
      return this.headingExtractor.headingToMarkdown(element, 3);
    }
    
    // Check for lists
    if (this.listExtractor.isList(element)) {
      return this.listExtractor.listToMarkdown(element);
    }
    
    // Check for code blocks
    if (this.codeBlockExtractor.isCodeBlock(element)) {
      return this.codeBlockExtractor.codeBlockToMarkdown(element);
    }
    
    // Add processing for other element types (can be extended later)
    
    // Default: treat as regular paragraph
    const text = element.innerText.trim();
    
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