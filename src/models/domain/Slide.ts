/**
 * Notion to Slides - Slide Domain Model
 * 
 * Represents a slide in a presentation
 */

import { SlideData, SlideMetadata } from './types';

/**
 * Slide class represents a single slide in a presentation
 */
export class Slide {
  title: string;
  content: string;
  sourceType: string;
  metadata: SlideMetadata;

  /**
   * Create a new slide
   * @param data - Slide data
   */
  constructor(data: Partial<SlideData> = {}) {
    this.title = data.title || '';
    this.content = data.content || '';
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {};
  }
  
  /**
   * Get the slide's markdown representation
   * @returns Markdown representation of slide
   */
  toMarkdown(): string {
    // Start with title as H1
    let markdown = `# ${this.title}\n\n`;
    
    // Add content
    if (this.content) {
      markdown += this.content;
    }
    
    return markdown;
  }
  
  /**
   * Convert to a plain object for storage
   * @returns Plain object representation
   */
  toObject(): SlideData {
    return {
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
  
  /**
   * Create a Slide from a plain object
   * @param obj - Plain object with slide data
   * @returns New Slide instance
   */
  static fromObject(obj: Partial<SlideData>): Slide {
    return new Slide(obj);
  }
  
  /**
   * Validate if the slide has the minimum required content
   * @returns Whether the slide is valid
   */
  isValid(): boolean {
    // A slide must have at least a title
    return !!this.title.trim();
  }
}