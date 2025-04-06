/**
 * Type definitions for Presentation domain model
 */

import { Slide } from './Slide';
import { PresentationData, PresentationMetadata, SlideData } from './types';

export class Presentation {
  title: string;
  slides: Slide[];
  sourceType: string;
  metadata: PresentationMetadata;
  
  /**
   * Create a new presentation
   * @param data - Presentation data
   */
  constructor(data?: PresentationData);
  
  /**
   * Add a slide to the presentation
   * @param slide - Slide to add
   * @returns New slide count
   */
  addSlide(slide: Slide | SlideData): number;
  
  /**
   * Remove a slide from the presentation
   * @param index - Index of slide to remove
   * @returns Removed slide or null
   */
  removeSlide(index: number): Slide | null;
  
  /**
   * Get a slide at a specific index
   * @param index - Slide index
   * @returns Slide or null if not found
   */
  getSlide(index: number): Slide | null;
  
  /**
   * Get the number of slides in the presentation
   */
  get slideCount(): number;
  
  /**
   * Convert to a plain object for storage
   * @returns Plain object representation
   */
  toObject(): PresentationData;
  
  /**
   * Create a Presentation from a plain object
   * @param obj - Plain object
   * @returns New Presentation instance
   */
  static fromObject(obj: PresentationData): Presentation;
  
  /**
   * Create a Presentation from slides data
   * @param slidesData - Array of slide data
   * @param sourceType - Source type
   * @returns New Presentation instance
   */
  static fromSlides(slidesData: SlideData[], sourceType?: string): Presentation;
}