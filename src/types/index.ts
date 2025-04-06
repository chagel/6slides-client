/**
 * Common type definitions for Notion Slides
 */

/**
 * Slide object - represents a single slide in a presentation
 */
export interface Slide {
  /** Slide title from heading */
  title: string;
  /** Slide content in markdown format */
  content: string;
  /** Source type (notion, markdown, etc.) */
  sourceType: 'notion' | 'markdown' | string;
  /** Optional slide metadata */
  metadata?: SlideMetadata;
}

/**
 * Slide metadata - optional additional information about a slide
 */
export interface SlideMetadata {
  /** Custom CSS classes to apply to the slide */
  classes?: string[];
  /** Custom data attributes */
  dataAttributes?: Record<string, string>;
  /** Background information */
  background?: {
    /** Background color (CSS value) */
    color?: string;
    /** Background image URL */
    image?: string;
    /** Background size (CSS value) */
    size?: string;
    /** Background position (CSS value) */
    position?: string;
  };
  /** Transition settings */
  transition?: {
    /** Transition style */
    style?: string;
    /** Transition speed */
    speed?: 'default' | 'fast' | 'slow';
  };
}

/**
 * Presentation object - represents a complete presentation
 */
export interface Presentation {
  /** Unique identifier */
  id: string;
  /** Presentation title */
  title: string;
  /** Array of slides */
  slides: Slide[];
  /** Source URL of the presentation */
  sourceUrl?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Presentation theme */
  theme?: string;
  /** Presentation settings */
  settings?: PresentationSettings;
}

/**
 * Presentation settings
 */
export interface PresentationSettings {
  /** Should show controls */
  controls?: boolean;
  /** Should show progress bar */
  progress?: boolean;
  /** Theme name */
  theme?: string;
  /** Transition style */
  transition?: string;
  /** Global background settings */
  background?: {
    /** Background color (CSS value) */
    color?: string;
    /** Background image URL */
    image?: string;
  };
}

/**
 * Extractor result interface
 */
export interface ExtractorResult {
  /** Array of extracted slides */
  slides: Slide[];
  /** Success status */
  success: boolean;
  /** Optional error message */
  errorMessage?: string;
}