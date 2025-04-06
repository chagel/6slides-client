/**
 * Notion to Slides - Paragraph Extractor
 * 
 * Extracts paragraph elements and converts them to markdown with formatting
 */

import { BaseExtractor } from '../baseExtractor.js';

export class ParagraphExtractor extends BaseExtractor {
  /**
   * Check if an element is a paragraph
   * @param {Element} element - The element to check
   * @returns {boolean} - True if the element is a paragraph
   */
  isParagraph(element) {
    return element.tagName === 'P' || 
           this.hasClass(element, 'notion-text-block') ||
           this.hasClass(element, 'notion-text');
  }
  
  /**
   * Convert a paragraph to markdown with formatting
   * @param {Element} element - The paragraph element
   * @returns {string} - Markdown formatted paragraph
   */
  paragraphToMarkdown(element) {
    let text = this.getElementText(element);
    
    if (!text.trim()) return '';
    
    // Process text formatting
    
    // Bold formatting
    if (element.querySelector('strong, b')) {
      const boldElements = element.querySelectorAll('strong, b');
      boldElements.forEach(el => {
        const boldText = el.textContent.trim();
        if (boldText && text.includes(boldText)) {
          text = text.replace(boldText, `**${boldText}**`);
        }
      });
    }
    
    // Italic formatting
    if (element.querySelector('em, i')) {
      const italicElements = element.querySelectorAll('em, i');
      italicElements.forEach(el => {
        const italicText = el.textContent.trim();
        if (italicText && text.includes(italicText)) {
          text = text.replace(italicText, `*${italicText}*`);
        }
      });
    }
    
    // Code/inline code formatting
    if (element.querySelector('code')) {
      const codeElements = element.querySelectorAll('code');
      codeElements.forEach(el => {
        const codeText = el.textContent.trim();
        if (codeText && text.includes(codeText)) {
          text = text.replace(codeText, `\`${codeText}\``);
        }
      });
    }
    
    return text;
  }
  
  /**
   * Find all paragraphs in the document
   * @returns {Element[]} - Array of paragraph elements
   */
  extractParagraphs() {
    const htmlParagraphs = this.findElements('p');
    const notionParagraphs = this.findElements('.notion-text-block, .notion-text');
    
    const allParagraphs = [...htmlParagraphs, ...notionParagraphs];
    this.debug(`Found ${allParagraphs.length} paragraphs`);
    
    return allParagraphs;
  }
}