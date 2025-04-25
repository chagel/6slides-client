/**
 * Six Slides - Slide Domain Model
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
  subslides: Slide[];

  /**
   * Create a new slide
   * @param data - Slide data
   */
  constructor(data: Partial<SlideData> = {}) {
    this.title = data.title || '';
    this.content = data.content || '';
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {};
    this.subslides = [];
    
    // Initialize subslides if provided
    if (Array.isArray(data.subslides)) {
      this.subslides = data.subslides.map(subslide => new Slide(subslide));
    }
  }
  
  /**
   * Add a subslide to this slide
   * @param subslide - The subslide to add
   */
  addSubslide(subslide: Slide): void {
    this.subslides.push(subslide);
  }
  
  /**
   * Check if this slide has any subslides
   * @returns Whether the slide has subslides
   */
  hasSubslides(): boolean {
    return this.subslides.length > 0;
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
    
    // Add subslides as H2
    if (this.hasSubslides()) {
      markdown += '\n\n';
      
      this.subslides.forEach(subslide => {
        markdown += `## ${subslide.title}\n\n${subslide.content}\n\n`;
      });
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
      metadata: { ...this.metadata },
      subslides: this.subslides.map(subslide => subslide.toObject())
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