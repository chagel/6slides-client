/**
 * Six Slides - Configuration Defaults
 * 
 * Default configuration values and types
 */

/**
 * Premium themes that require a subscription
 */
export const PREMIUM_THEMES = [
  'compass',  // Interactive workshops
  'ignite',   // Startup pitches
  'palette',  // Creative showcases
  'pulse',    // Data-driven reports
  'scholar',  // Academic lectures
  'summit'    // Executive boardroom
];

/**
 * Themes that require web fonts to be loaded
 */
export const THEMES_WITH_WEB_FONTS: Record<string, string[]> = {
  'palette': ['bebasneue'],
  'ignite': ['montserrat'],
  'scholar': ['georgia'],
  'pulse': ['inter'],
  'compass': ['verdana'],
  'summit': ['segoeui']
};

/**
 * Theme categories with descriptions
 */
export const THEME_CATEGORIES: Record<string, string> = {
  'summit': 'Executive boardroom',
  'ignite': 'Startup pitches',
  'scholar': 'Academic lectures',
  'palette': 'Creative showcases',
  'pulse': 'Data-driven reports',
  'compass': 'Interactive workshops',
  'default': 'Default theme',
  'light': 'Light theme',
  'dark': 'Dark theme'
};

/**
 * Premium fonts that require a subscription
 */
export const PREMIUM_FONTS = {
  heading: ['montserrat', 'bebasneue', 'playfair'],
  content: ['roboto', 'opensans', 'sourcesans', 'inter']
};

/**
 * Subscription level enum
 */
export enum SubscriptionLevel {
  FREE = 'free',
  PRO = 'pro',
  VIP = 'vip'
}

/**
 * Configuration interface
 */
export interface Config {
  // Presentation settings
  theme: string;
  transition: string;
  slideNumber: boolean;
  center: boolean;
  headingFont: string; // Custom font for headings
  contentFont: string; // Custom font for content
  
  // Extension settings
  debugLogging: boolean;
  extractionTimeout: number; // seconds
  
  // Subscription settings
  subscriptionLevel: SubscriptionLevel;
  subscriptionExpiry: number | null; // timestamp
  
  // User authentication
  userEmail: string | null;
  userToken: string | null;
  
  // Allow additional properties
  [key: string]: any;
}

/**
 * Presentation settings interface
 */
export interface PresentationSettings {
  theme: string;
  transition: string;
  slideNumber: boolean | string;
  center: boolean | string;
}

// Default configuration values
export const DEFAULT_CONFIG: Config = {
  // Presentation settings
  theme: 'default',
  transition: 'slide',
  slideNumber: false,
  center: true,
  headingFont: 'default',
  contentFont: 'default',
  
  // Extension settings
  debugLogging: false,
  extractionTimeout: 30, // seconds
  
  // Subscription settings
  subscriptionLevel: SubscriptionLevel.FREE,
  subscriptionExpiry: null,
  
  // User authentication
  userEmail: null,
  userToken: null
};