/**
 * Type definitions for domain models
 */

/**
 * Slide metadata interface
 */
export interface SlideMetadata {
  classes?: string[];
  dataAttributes?: Record<string, string>;
  background?: {
    color?: string;
    image?: string;
    size?: string;
    position?: string;
  };
  transition?: {
    style?: string;
    speed?: 'default' | 'fast' | 'slow';
  };
  [key: string]: any;
}

/**
 * Slide data interface
 */
export interface SlideData {
  title: string;
  content: string;
  sourceType: string;
  metadata?: SlideMetadata;
}

/**
 * Presentation metadata interface
 */
export interface PresentationMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Presentation data interface
 */
export interface PresentationData {
  title: string;
  slides: SlideData[];
  sourceType: string;
  metadata?: PresentationMetadata;
}

/**
 * Presentation settings interface
 */
export interface PresentationSettings {
  theme?: string;
  transition?: string;
  center?: string;
  slideNumber?: string;
  controls?: boolean;
  progress?: boolean;
  [key: string]: any;
}