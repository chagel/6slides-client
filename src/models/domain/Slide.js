/**
 * Notion to Slides - Slide Domain Model
 * 
 * Represents a slide in a presentation
 */

/**
 * Slide class represents a single slide in a presentation
 */
export class Slide {
  /**
   * Create a new slide
   * @param {Object} data - Slide data
   * @param {string} data.title - Slide title
   * @param {string} data.content - Slide content as markdown
   * @param {string} data.sourceType - Source type (notion, markdown, etc.)
   * @param {Object} data.metadata - Additional metadata
   */
  constructor(data = {}) {
    this.title = data.title || '';
    this.content = data.content || '';
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {};
  }
  
  /**
   * Get the slide's markdown representation
   * @returns {string} - Markdown representation of slide
   */
  toMarkdown() {
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
   * @returns {Object} - Plain object representation
   */
  toObject() {
    return {
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
  
  /**
   * Create a Slide from a plain object
   * @param {Object} obj - Plain object with slide data
   * @returns {Slide} - New Slide instance
   */
  static fromObject(obj) {
    return new Slide(obj);
  }
  
  /**
   * Validate if the slide has the minimum required content
   * @returns {boolean} - Whether the slide is valid
   */
  isValid() {
    // A slide must have at least a title
    return !!this.title.trim();
  }
}