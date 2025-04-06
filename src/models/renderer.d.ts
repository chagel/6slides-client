/**
 * Type definitions for Presentation Renderer
 */

import { PresentationSettings } from './domain/types';

export interface RendererOptions {
  containerId?: string;
}

export class PresentationRenderer {
  /**
   * Constructor for the presentation renderer
   * @param options - Configuration options
   */
  constructor(options?: RendererOptions);
  
  /**
   * Load slides and initialize the presentation
   * @returns Promise that resolves when presentation is ready
   */
  loadAndRender(): Promise<void>;
  
  /**
   * Create a slide from slide data
   * @param slide - Slide data object
   */
  createMarkdownSlide(slide: {
    title?: string;
    content?: string;
    sourceType?: string;
  }): void;
  
  /**
   * Initialize reveal.js
   * @param settings - Presentation settings
   */
  initReveal(settings?: PresentationSettings): void;
  
  /**
   * Show message when no slides are found
   */
  showNoSlidesMessage(): void;
  
  /**
   * Show an error message as a slide
   * @param message - Error message to display
   */
  showErrorMessage(message: string): void;
}