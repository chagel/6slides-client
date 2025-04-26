/**
 * Font utility functions
 */

import { loggingService } from '../services/logging_service';

/**
 * Font information interface
 */
export interface FontInfo {
  family: string;
  url: string;
}

/**
 * Available fonts based on cross-platform compatibility and presentation quality
 */
export const FONTS: Record<string, FontInfo> = {
  // Display / Heading Fonts - optimized for ≥ 40pt
  montserrat: { 
    family: '"Montserrat", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap'
  },
  helveticaneue: { 
    family: '"Helvetica Neue", Helvetica, Arial, sans-serif', 
    url: '' // System font, no need to load
  },
  bebasneue: { 
    family: '"Bebas Neue", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'
  },
  gillsans: { 
    family: '"Gill Sans MT", "Gill Sans", Calibri, sans-serif', 
    url: '' // System font, no need to load
  },
  georgia: { 
    family: 'Georgia, serif', 
    url: '' // System font, no need to load
  },
  segoeui: { 
    family: '"Segoe UI", Tahoma, Geneva, sans-serif', 
    url: '' // System font, no need to load
  },
  playfair: { 
    family: '"Playfair Display", serif', 
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap' 
  },
  
  // Body / Content Fonts - optimized for 18-32pt
  calibri: { 
    family: 'Calibri, "Segoe UI", sans-serif', 
    url: '' // System font, no need to load
  },
  roboto: { 
    family: '"Roboto", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap' 
  },
  opensans: { 
    family: '"Open Sans", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap' 
  },
  arial: { 
    family: 'Arial, Helvetica, sans-serif', 
    url: '' // System font, no need to load
  },
  verdana: { 
    family: 'Verdana, Geneva, sans-serif', 
    url: '' // System font, no need to load
  },
  sourcesans: { 
    family: '"Source Sans Pro", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&display=swap' 
  },
  inter: { 
    family: '"Inter", sans-serif', 
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap' 
  }
};

// Track loaded fonts to avoid duplicates
const loadedFonts = new Set<string>();

/**
 * Load a font if needed
 * @param fontKey - The key of the font to load
 * @param context - Logging context
 * @returns True if font was loaded, false if already loaded, system font, or not found
 */
export function loadFontIfNeeded(fontKey: string, context = 'app'): boolean {
  if (!fontKey || fontKey === 'default' || loadedFonts.has(fontKey)) {
    return false;
  }
  
  const fontInfo = FONTS[fontKey];
  if (!fontInfo) {
    loggingService.debug(`Font not found: ${fontKey}`, null, context);
    return false;
  }
  
  // Check if it's a system font (no URL)
  if (!fontInfo.url || fontInfo.url.trim() === '') {
    loggingService.debug(`Using system font: ${fontKey}`, null, context);
    loadedFonts.add(fontKey); // Mark as "loaded" even though no HTTP load needed
    return false;
  }
  
  // Check if the font is already in the DOM
  const linkId = `font-${fontKey}`;
  const existingLink = document.getElementById(linkId);
  if (existingLink) {
    loadedFonts.add(fontKey);
    loggingService.debug(`Font already loaded: ${fontKey}`, null, context);
    return false; // Already in DOM
  }
  
  // Add the font link
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = fontInfo.url;
  document.head.appendChild(link);
  
  // Mark as loaded
  loadedFonts.add(fontKey);
  loggingService.debug(`Loaded web font: ${fontKey}`, null, context);
  return true;
}

/**
 * Get font family CSS value from key
 * @param fontKey - The key of the font
 * @returns The font family CSS value with fallbacks or undefined if using default
 * 
 * Example return values:
 * - '"Montserrat", sans-serif'
 * - 'Georgia, serif'
 * - 'Arial, Helvetica, sans-serif'
 */
export function getFontFamily(fontKey: string): string | undefined {
  if (!fontKey || fontKey === 'default') {
    return undefined;
  }
  
  return FONTS[fontKey]?.family;
}

/**
 * Get font category (heading or body)
 * @param fontKey - The key of the font
 * @returns 'heading', 'body', or undefined if not found
 */
export function getFontCategory(fontKey: string): 'heading' | 'body' | undefined {
  if (!fontKey || fontKey === 'default') {
    return undefined;
  }
  
  // Heading fonts
  if (['montserrat', 'helveticaneue', 'bebasneue', 'gillsans', 
       'georgia', 'segoeui', 'playfair'].includes(fontKey)) {
    return 'heading';
  }
  
  // Body fonts
  if (['calibri', 'roboto', 'opensans', 'arial', 'verdana', 
       'sourcesans', 'inter'].includes(fontKey)) {
    return 'body';
  }
  
  return undefined;
}

/**
 * Font pairing recommendations based on best practices for presentations
 */
export const FONT_PAIRINGS: Record<string, {body: string, style: string}> = {
  // Recommended combinations for heading -> body fonts
  montserrat: { body: 'opensans', style: 'Clean tech / startup demo' },
  segoeui: { body: 'segoeui', style: 'Corporate but modern' },
  helveticaneue: { body: 'helveticaneue', style: 'Apple-esque minimalism' },
  georgia: { body: 'calibri', style: 'Editorial / report style' },
  bebasneue: { body: 'roboto', style: 'Bold, youthful campaigns' },
  playfair: { body: 'sourcesans', style: 'Elegant, editorial look' },
  gillsans: { body: 'arial', style: 'Professional, clean appearance' }
};

/**
 * Get recommended body font to pair with heading font
 * @param headingFontKey - The key of the heading font
 * @returns The recommended body font key or 'arial' as fallback
 */
export function getRecommendedBodyFont(headingFontKey: string): string {
  if (!headingFontKey || headingFontKey === 'default') {
    return 'arial'; // Safe fallback
  }
  
  return FONT_PAIRINGS[headingFontKey]?.body || 'arial';
}