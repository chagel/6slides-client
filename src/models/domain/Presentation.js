/**
 * Notion to Slides - Presentation Domain Model
 * 
 * Represents a complete presentation with slides
 */

import { Slide } from './Slide.js';

/**
 * Presentation class represents a collection of slides
 */
export class Presentation {
  /**
   * Create a new presentation
   * @param {Object} data - Presentation data
   * @param {string} data.title - Presentation title
   * @param {Slide[]} data.slides - Array of slides
   * @param {string} data.sourceType - Source type (notion, markdown, etc.)
   * @param {Object} data.metadata - Additional metadata
   */
  constructor(data = {}) {
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
   * @param {Slide|Object} slide - Slide to add
   * @returns {number} - New slide count
   */
  addSlide(slide) {
    const newSlide = slide instanceof Slide ? slide : new Slide(slide);
    if (newSlide.isValid()) {
      this.slides.push(newSlide);
      this.metadata.updatedAt = new Date().toISOString();
    }
    return this.slides.length;
  }
  
  /**
   * Remove a slide from the presentation
   * @param {number} index - Index of slide to remove
   * @returns {Slide|null} - Removed slide or null
   */
  removeSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      const removed = this.slides.splice(index, 1)[0];
      this.metadata.updatedAt = new Date().toISOString();
      return removed;
    }
    return null;
  }
  
  /**
   * Get a slide at a specific index
   * @param {number} index - Slide index
   * @returns {Slide|null} - Slide or null if not found
   */
  getSlide(index) {
    return (index >= 0 && index < this.slides.length) ? this.slides[index] : null;
  }
  
  /**
   * Get the number of slides in the presentation
   * @returns {number} - Slide count
   */
  get slideCount() {
    return this.slides.length;
  }
  
  /**
   * Convert to a plain object for storage
   * @returns {Object} - Plain object representation
   */
  toObject() {
    return {
      title: this.title,
      slides: this.slides.map(slide => slide.toObject()),
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
  
  /**
   * Create a Presentation from a plain object
   * @param {Object} obj - Plain object
   * @returns {Presentation} - New Presentation instance
   */
  static fromObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return new Presentation();
    }
    
    return new Presentation({
      title: obj.title,
      slides: Array.isArray(obj.slides) ? obj.slides.map(s => Slide.fromObject(s)) : [],
      sourceType: obj.sourceType,
      metadata: obj.metadata || {}
    });
  }
  
  /**
   * Create a Presentation from slides data
   * @param {Object[]} slidesData - Array of slide data
   * @param {string} sourceType - Source type
   * @returns {Presentation} - New Presentation instance
   */
  static fromSlides(slidesData, sourceType = 'unknown') {
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