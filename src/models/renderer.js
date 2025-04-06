/**
 * Notion to Slides - Presentation Renderer
 * 
 * Handles rendering slides with reveal.js
 */

import { logDebug, logError } from '../common/utils.js';
import { storage } from './storage.js';

export class PresentationRenderer {
  /**
   * Constructor for the presentation renderer
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the slide container element
   */
  constructor(options = {}) {
    this.containerId = options.containerId || 'slideContainer';
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      throw new Error(`Slide container element with ID "${this.containerId}" not found`);
    }
    
    logDebug('Presentation renderer initialized', {
      containerId: this.containerId
    });
  }
  
  /**
   * Load slides and initialize the presentation
   * @returns {Promise<void>}
   */
  async loadAndRender() {
    try {
      // Get slides from storage
      const slides = await storage.getSlides();
      
      // Log the raw slides data from storage
      console.log('==== RAW SLIDES FROM STORAGE ====');
      console.log(JSON.stringify(slides, null, 2));
      console.log('=================================');
      
      // Get settings
      const settings = storage.getSettings();
      
      // Check if we have slides
      if (!Array.isArray(slides) || slides.length === 0) {
        logError('No slides data found in storage');
        this.showNoSlidesMessage();
        return;
      }
      
      logDebug(`Creating presentation with ${slides.length} slides`);
      
      // Create slides from markdown content
      slides.forEach(this.createMarkdownSlide.bind(this));
      
      // Initialize reveal.js
      this.initReveal(settings);
    } catch (error) {
      logError('Error loading and rendering presentation', error);
      this.showErrorMessage(error.message);
    }
  }
  
  /**
   * Create a slide from slide data
   * @param {Object} slide - Slide data object
   * @param {string} slide.title - Slide title
   * @param {string} slide.content - Slide content
   * @param {string} slide.sourceType - Content source type (notion, markdown, etc.)
   */
  createMarkdownSlide(slide) {
    // Validate slide object
    if (!slide || typeof slide !== 'object') {
      logError('Invalid slide format: Expected an object', slide);
      return;
    }
    
    // Ensure we have string values for title and content
    let title = 'Untitled Slide';
    if (slide.title !== undefined && slide.title !== null) {
      title = String(slide.title).trim();
    }
    
    let content = '';
    if (slide.content !== undefined && slide.content !== null) {
      content = String(slide.content).trim();
      
      // Handle escaped newlines that might have come from storage
      content = content.replace(/\\n/g, '\n');
    }
    
    // Log which source type we're rendering
    const sourceType = slide.sourceType || 'unknown';
    logDebug(`Rendering slide from source: ${sourceType}`, { 
      title: title.substring(0, 30) + (title.length > 30 ? '...' : ''),
      contentLength: content.length
    });
    
    // Create markdown with title as h1 and content below
    const markdown = `# ${title}\n\n${content}`;
    
    // Log the exact markdown content being sent to reveal.js
    console.log('==== MARKDOWN CONTENT PASSED TO REVEAL.JS ====');
    console.log(markdown);
    console.log('==============================================');
    
    const section = document.createElement('section');
    section.setAttribute('data-markdown', '');
    section.setAttribute('data-source-type', sourceType);
    
    const textarea = document.createElement('textarea');
    textarea.setAttribute('data-template', '');
    textarea.textContent = markdown;
    
    section.appendChild(textarea);
    this.container.appendChild(section);
  }
  
  /**
   * Initialize reveal.js
   * @param {Object} settings - Presentation settings
   */
  initReveal(settings = {}) {
    // Check if markdown plugin is available
    if (typeof RevealMarkdown === 'undefined') {
      logError('Error: RevealMarkdown plugin is not available!');
      alert('Error: Required plugin for markdown is missing. Slides may not render properly.');
      
      // Fall back to basic reveal initialization
      Reveal.initialize({
        controls: true,
        progress: true
      });
      return;
    }
    
    // Define plugins to use
    let plugins = [RevealMarkdown];
    
    logDebug('Initializing reveal.js with markdown plugin');
    
    // Get presentation settings with defaults
    const theme = settings.theme || 'default';
    const transition = settings.transition || 'slide';
    const slideNumber = settings.slideNumber === 'true';
    const center = settings.center !== 'false';
    
    logDebug('Using presentation settings', { theme, transition, slideNumber, center });
    
    // Set the theme
    document.getElementById('theme-stylesheet').href = `lib/reveal.js/theme/${theme}.css`;
    
    // Configure and initialize reveal.js
    Reveal.initialize({
      // Presentation features
      controls: true,
      progress: true,
      center: center,
      hash: true,
      transition: transition,
      
      // Display
      slideNumber: slideNumber,
      
      // Behavior
      keyboard: true,
      touch: true,
      
      // Plugins
      plugins: plugins,
    }).then(() => {
      logDebug('Reveal.js initialization complete');
    });
  }
  
  /**
   * Show message when no slides are found
   */
  showNoSlidesMessage() {
    const errorSection = document.createElement('section');
    errorSection.innerHTML = `
      <h2>No slides found</h2>
      <p>Please go back to Notion and try again.</p>
      <p>Make sure your Notion page has H1 headings to define slides.</p>
    `;
    this.container.appendChild(errorSection);
    
    Reveal.initialize({ controls: true });
    logError('No slides found in storage');
  }
  
  /**
   * Show an error message as a slide
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    const errorSection = document.createElement('section');
    errorSection.innerHTML = `
      <h2>Error</h2>
      <p>${message || 'An unknown error occurred.'}</p>
      <p>Please go back to Notion and try again.</p>
    `;
    this.container.appendChild(errorSection);
    
    Reveal.initialize({ controls: true });
  }
}