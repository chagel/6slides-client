/**
 * Six Slides - Image Extractor
 * 
 * Extracts image elements and converts them to markdown
 */

import { BaseExtractor } from '../base_extractor';
import { IImageExtractor } from './types';

export class ImageExtractor extends BaseExtractor implements IImageExtractor {
  /**
   * Check if an element is an image or contains an image
   * @param element - The element to check
   * @returns True if the element is an image or contains an image
   */
  isImage(element: Element): boolean {
    return element.tagName === 'IMG' || 
           ('querySelector' in element && element.querySelector('img') !== null) ||
           this.hasClass(element, 'notion-image-block');
  }
  
  /**
   * Convert an image to markdown format
   * @param element - The image element or container
   * @returns Markdown image
   */
  imageToMarkdown(element: Element): string {
    // Find the actual img element
    const img = element.tagName === 'IMG' ? 
                element as HTMLImageElement : 
                element.querySelector('img');
                
    if (!img || !(img as HTMLImageElement).src) return '';
    
    // Get alt text or provide a default
    const imgElement = img as HTMLImageElement;
    const alt = imgElement.alt || imgElement.title || 'Image';
    
    // Create markdown image
    return `![${alt}](${imgElement.src})`;
  }
  
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // Image extraction is typically part of a larger extraction process
    return [];
  }
}