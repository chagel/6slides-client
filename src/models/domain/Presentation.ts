/**
 * Notion to Slides - Presentation Domain Model
 * 
 * Represents a complete presentation with slides
 */

import { Slide } from './Slide';
import { PresentationData, PresentationMetadata, SlideData } from './types';

/**
 * Presentation class represents a collection of slides
 */
export class Presentation {
  title: string;
  slides: Slide[];
  sourceType: string;
  metadata: PresentationMetadata;

  /**
   * Create a new presentation
   * @param data - Presentation data
   */
  constructor(data: Partial<PresentationData> = {}) {
    this.title = data.title || 'Untitled Presentation';
    this.slides = Array.isArray(data.slides) ? data.slides.map(slide => {
      return slide instanceof Slide ? slide : new Slide(slide);
    }) : [];
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Add a slide to the presentation
   * @param slide - Slide to add
   * @returns New slide count
   */
  addSlide(slide: Slide | SlideData): number {
    const newSlide = slide instanceof Slide ? slide : new Slide(slide);
    if (newSlide.isValid()) {
      this.slides.push(newSlide);
      this.metadata.updatedAt = new Date().toISOString();
    }
    return this.slides.length;
  }
  
  /**
   * Remove a slide from the presentation
   * @param index - Index of slide to remove
   * @returns Removed slide or null
   */
  removeSlide(index: number): Slide | null {
    if (index >= 0 && index < this.slides.length) {
      const removed = this.slides.splice(index, 1)[0];
      this.metadata.updatedAt = new Date().toISOString();
      return removed;
    }
    return null;
  }
  
  /**
   * Get a slide at a specific index
   * @param index - Slide index
   * @returns Slide or null if not found
   */
  getSlide(index: number): Slide | null {
    return (index >= 0 && index < this.slides.length) ? this.slides[index] : null;
  }
  
  /**
   * Get the number of slides in the presentation
   * @returns Slide count
   */
  get slideCount(): number {
    return this.slides.length;
  }
  
  /**
   * Convert to a plain object for storage
   * @returns Plain object representation
   */
  toObject(): PresentationData {
    return {
      title: this.title,
      slides: this.slides.map(slide => slide.toObject()),
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
  
  /**
   * Create a Presentation from a plain object
   * @param obj - Plain object
   * @returns New Presentation instance
   */
  static fromObject(obj: Partial<PresentationData>): Presentation {
    if (!obj || typeof obj !== 'object') {
      return new Presentation();
    }
    
    return new Presentation({
      title: obj.title,
      slides: Array.isArray(obj.slides) ? obj.slides.map(s => Slide.fromObject(s)) : [],
      sourceType: obj.sourceType,
      metadata: obj.metadata
    });
  }
  
  /**
   * Create a Presentation from slides data
   * @param slidesData - Array of slide data
   * @param sourceType - Source type
   * @returns New Presentation instance
   */
  static fromSlides(slidesData: SlideData[], sourceType = 'unknown'): Presentation {
    // Extract title from first slide if available
    const title = Array.isArray(slidesData) && slidesData.length > 0 
      ? slidesData[0].title || 'Untitled Presentation'
      : 'Untitled Presentation';
    
    return new Presentation({
      title,
      slides: slidesData,
      sourceType
    });
  }
}