/**
 * Notion to Slides - Image Extractor
 * 
 * Extracts image elements and converts them to markdown
 */

import { BaseExtractor } from '../baseExtractor.js';

export class ImageExtractor extends BaseExtractor {
  /**
   * Check if an element is an image or contains an image
   * @param {Element} element - The element to check
   * @returns {boolean} - True if the element is an image or contains an image
   */
  isImage(element) {
    return element.tagName === 'IMG' || 
           (element.querySelector && element.querySelector('img')) ||
           this.hasClass(element, 'notion-image-block');
  }
  
  /**
   * Convert an image to markdown format
   * @param {Element} element - The image element or container
   * @returns {string} - Markdown image
   */
  imageToMarkdown(element) {
    // Find the actual img element
    const img = element.tagName === 'IMG' ? 
                element : 
                element.querySelector('img');
                
    if (!img || !img.src) return '';
    
    // Get alt text or provide a default
    const alt = img.alt || img.title || 'Image';
    
    // Create markdown image
    return `![${alt}](${img.src})`;
  }
  
  /**
   * Find all images in the document
   * @returns {Element[]} - Array of image elements
   */
  extractImages() {
    const htmlImages = this.findElements('img');
    const notionImages = this.findElements('.notion-image-block');
    
    // Deduplicate (don't include images inside image blocks already found)
    const allImages = [...htmlImages, ...notionImages].filter((img, index, self) => {
      // If this is an img element inside a notion-image-block, skip it
      if (img.tagName === 'IMG' && 
          img.closest('.notion-image-block') && 
          self.includes(img.closest('.notion-image-block'))) {
        return false;
      }
      return true;
    });
    
    this.debug(`Found ${allImages.length} images`);
    return allImages;
  }
}