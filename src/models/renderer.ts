/**
 * Notion to Slides - Presentation Renderer
 * 
 * Handles rendering slides with reveal.js
 */

import { loggingService } from '../services/logging_service';
import { storage } from './storage';
import { Presentation } from './domain/presentation';
import { configManager } from './config_manager';
import { errorService, ErrorTypes, ErrorSeverity } from '../services/error_service';
import { PresentationSettings } from './domain/types';
import { Slide } from '../types/index';

declare global {
  interface Window {
    Reveal: any;
    RevealMarkdown: any;
  }
}

// Access the reveal.js API
const Reveal = window.Reveal;
const RevealMarkdown = window.RevealMarkdown;

/**
 * Options for the presentation renderer
 */
export interface RendererOptions {
  /** ID of the container element to render slides in */
  containerId?: string;
}

/**
 * Presentation renderer class
 * Handles rendering slides with reveal.js
 */
export class PresentationRenderer {
  private containerId: string;
  private container: HTMLElement;
  
  /**
   * Constructor for the presentation renderer
   * @param options - Configuration options
   */
  constructor(options: RendererOptions = {}) {
    this.containerId = options.containerId || 'slideContainer';
    const container = document.getElementById(this.containerId);
    
    if (!container) {
      throw new Error(`Slide container element with ID "${this.containerId}" not found`);
    }
    
    this.container = container;
    
    loggingService.debug('Presentation renderer initialized', {
      containerId: this.containerId
    });
  }
  
  /**
   * Load slides and initialize the presentation
   * @returns Promise that resolves when presentation is ready
   */
  async loadAndRender(): Promise<void> {
    try {
      // Get subscription status using the async configManager methods
      const hasPro = await configManager.hasPro();
      const level = await configManager.getSubscriptionLevel();
      
      // Log subscription status for debugging
      loggingService.debug(`Rendering with ${level.toUpperCase()} subscription (Pro features: ${hasPro ? 'Enabled' : 'Disabled'})`, null, 'viewer');
      
      // Get slides from storage
      const rawSlides = await storage.getSlides();
      
      // Log presentation rendering start
      loggingService.debug(`Rendering with ${level.toUpperCase()} plan. Total slides: ${rawSlides.length}`, null, 'viewer');
      
      // Log the raw slides data from storage (debug only)
      loggingService.debug('Raw slides loaded from storage', { rawSlides }, 'viewer');
      loggingService.debug(`Loaded ${rawSlides?.length || 0} slides from storage`, null, 'viewer');
      
      // Get settings from config manager asynchronously
      const settings = await configManager.getPresentationSettings();
      loggingService.debug('Presentation settings', settings, 'viewer');
      
      // Check if we have slides
      if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
        loggingService.error('No slides data found in storage', null, 'viewer');
        errorService.trackError('No slides data found in storage', {
          type: ErrorTypes.RENDERING,
          context: 'presentation_loading'
        });
        this.showNoSlidesMessage();
        return;
      }
      
      // Create a domain presentation model - slides should already be limited for free users by ContentController
      const presentation = Presentation.fromSlides(rawSlides);
      
      // Log subscription status - we already have hasPro from above, no need to call again
      loggingService.debug(`Rendering with ${hasPro ? 'PRO' : 'FREE'} plan. Total slides: ${presentation.slideCount}`, null, 'viewer');
      
      loggingService.debug(`Creating presentation with ${presentation.slideCount} slides`, null, 'viewer');
      
      // Create slides from the presentation model
      presentation.slides.forEach((slide, index) => {
        loggingService.debug(`Creating slide ${index + 1}/${presentation.slideCount}: "${slide.title}"`, null, 'viewer');
        this.createMarkdownSlide(slide.toObject());
      });
      
      // Initialize reveal.js
      this.initReveal(settings);
    } catch (error) {
      // Use error service for consistent error handling
      errorService.trackError(error instanceof Error ? error : new Error(String(error)), {
        type: ErrorTypes.RENDERING,
        context: 'presentation_rendering',
        severity: ErrorSeverity.ERROR
      });
      
      this.showErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Create a slide from slide data
   * @param slide - Slide data object
   */
  createMarkdownSlide(slide: Partial<Slide>): void {
    // Validate slide object
    if (!slide || typeof slide !== 'object') {
      loggingService.error('Invalid slide format: Expected an object', slide);
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
    
    const sourceType = slide.sourceType || 'unknown';
    
    // Create markdown with title as h1 and content below
    const markdown = `# ${title}\n\n${content}`;
    
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
   * @param settings - Presentation settings
   */
  initReveal(settings: Partial<PresentationSettings> = {}): void {
    // Check if markdown plugin is available
    if (typeof RevealMarkdown === 'undefined') {
      loggingService.error('Error: RevealMarkdown plugin is not available!', null, 'viewer');
      alert('Error: Required plugin for markdown is missing. Slides may not render properly.');
      
      // Fall back to basic reveal initialization
      Reveal.initialize({
        controls: true,
        progress: true
      });
      return;
    }
    
    // Define plugins to use
    const plugins = [RevealMarkdown];
    
    loggingService.debug('Initializing reveal.js with markdown plugin', null, 'viewer');
    
    // Get presentation settings with defaults
    const theme = settings.theme || 'default';
    const transition = settings.transition || 'slide';
    const slideNumber = settings.slideNumber === 'true';
    const center = settings.center !== 'false' ? 'true' : 'false';
    
    // Set the theme
    const themeStylesheet = document.getElementById('theme-stylesheet') as HTMLLinkElement;
    if (themeStylesheet) {
      themeStylesheet.href = `lib/reveal.js/theme/${theme}.css`;
    }
    
    // Configure and initialize reveal.js
    Reveal.initialize({
      // Presentation features
      controls: true,
      progress: true,
      center: center === 'true',
      hash: true,
      transition: transition,
      
      // Display
      slideNumber: slideNumber,
      
      // Behavior
      keyboard: true,
      touch: true,
      
      // Plugins
      plugins: plugins,
    }).catch((err: Error) => {
      loggingService.error('Error initializing Reveal.js', err, 'viewer');
    });
  }
  
  /**
   * Show message when no slides are found
   */
  showNoSlidesMessage(): void {
    const errorSection = document.createElement('section');
    errorSection.innerHTML = `
      <h2>No slides found</h2>
      <p>Please go back to Notion and try again.</p>
      <p>Make sure your Notion page has H1 headings to define slides.</p>
    `;
    this.container.appendChild(errorSection);
    
    Reveal.initialize({ controls: true });
    loggingService.error('No slides found in storage', null, 'viewer');
  }
  
  /**
   * Show an error message as a slide
   * @param message - Error message to display
   */
  showErrorMessage(message: string): void {
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