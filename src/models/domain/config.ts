/**
 * Six Slides - Configuration Defaults
 * 
 * Default configuration values and types
 */

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