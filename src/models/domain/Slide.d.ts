/**
 * Type definitions for Slide domain model
 */

import { SlideData, SlideMetadata } from './types';

export class Slide {
  title: string;
  content: string;
  sourceType: string;
  metadata: SlideMetadata;
  
  /**
   * Create a new slide
   * @param data - Slide data
   */
  constructor(data?: SlideData);
  
  /**
   * Get the slide's markdown representation
   * @returns Markdown representation of slide
   */
  toMarkdown(): string;
  
  /**
   * Convert to a plain object for storage
   * @returns Plain object representation
   */
  toObject(): SlideData;
  
  /**
   * Create a Slide from a plain object
   * @param obj - Plain object with slide data
   * @returns New Slide instance
   */
  static fromObject(obj: SlideData): Slide;
  
  /**
   * Validate if the slide has the minimum required content
   * @returns Whether the slide is valid
   */
  isValid(): boolean;
}