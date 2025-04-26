/**
 * Six Slides - Viewer Script
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

import { loggingService } from '../../services/logging_service';
import { PresentationRenderer } from '../../models/renderer';
import { configManager } from '../../models/config_manager';
import { debugService } from '../../services/debug_service';
import { loadFontIfNeeded, getFontFamily } from '../../utils/fonts';
import { setupLogoLink } from '../../utils/ui';
import { PdfExporter } from '../../models/pdf_exporter';
import { KeyboardHints } from '../../models/keyboard_hints';
import { PREMIUM_THEMES, THEMES_WITH_WEB_FONTS } from '../../models/domain/config';

// Get the web URL from environment variables
const WEB_URL = process.env.WEB_URL || 'https://6slides.com';

/**
 * Apply custom fonts directly to the document using CSS variables
 * @param headingFont Font for headings
 * @param contentFont Font for content
 * @param theme The current theme
 */
async function applyCustomFonts(headingFont?: string, contentFont?: string, theme?: string): Promise<void> {
  try {
    // Remove custom fonts class if it exists
    document.body.classList.remove('custom-fonts-active');
    
    // For default fonts, let the theme's built-in styles take precedence
    if ((!headingFont || headingFont === 'default') && 
        (!contentFont || contentFont === 'default')) {
      
      // For theme-specific fonts, just make sure any CSS variables are cleared
      document.documentElement.style.removeProperty('--heading-font');
      document.documentElement.style.removeProperty('--content-font');
      
      // Load any web fonts required by the theme
      if (theme && PREMIUM_THEMES.includes(theme) && THEMES_WITH_WEB_FONTS[theme]) {
        for (const fontKey of THEMES_WITH_WEB_FONTS[theme]) {
          loadFontIfNeeded(fontKey, 'viewer');
          loggingService.debug(`Loaded theme font: ${fontKey} for theme: ${theme}`, null, 'viewer');
        }
      }
      
      loggingService.debug(`Using theme default fonts for: ${theme || 'default'}`, null, 'viewer');
      return;
    }

    // Custom fonts are being used - add the class
    document.body.classList.add('custom-fonts-active');
    
    loggingService.debug(`Applying custom fonts: headings=${headingFont}, content=${contentFont}`, null, 'viewer');
    
    // Load fonts if needed
    if (headingFont && headingFont !== 'default') {
      loadFontIfNeeded(headingFont, 'viewer');
    }
    
    if (contentFont && contentFont !== 'default') {
      loadFontIfNeeded(contentFont, 'viewer');
    }
    
    // Get font families
    const headingFontFamily = getFontFamily(headingFont || '');
    const contentFontFamily = getFontFamily(contentFont || '');
    
    // Apply styles via CSS variables
    document.documentElement.style.setProperty('--heading-font', headingFontFamily || 'inherit');
    document.documentElement.style.setProperty('--content-font', contentFontFamily || 'inherit');
    
    loggingService.debug('Custom fonts applied with custom-fonts-active class', null, 'viewer');
  } catch (error) {
    loggingService.error('Failed to apply custom fonts', error, 'viewer');
  }
}

/**
 * Initialize the viewer
 */
// Flag to track initialization in this viewer instance
let viewerInitialized = false;

async function initialize(): Promise<void> {
  // Set document title
  document.title = 'Six Slides';
  
  // Initialize immediately without waiting for DOM events
  if (viewerInitialized) {
    loggingService.warn('Viewer already initialized, preventing duplicate initialization', null, 'viewer');
    return;
  }
  
  try {
    // Set flag to prevent double initialization
    viewerInitialized = true;
    
    // Set up the logo link
    setupLogoLink(WEB_URL);
    
    // Get renderer settings from the config
    const config = await configManager.getConfig();
    await debugService.setupDebugIndicator(
      {
        position: 'bottom-right',
        text: 'DEBUG MODE',
        zIndex: 9999
      },
      'viewer', 
      { config }
    );

    const settings = {
      theme: config.theme,
      transition: config.transition,
      slideNumber: config.slideNumber,
      center: config.center,
      headingFont: config.headingFont,
      contentFont: config.contentFont
    };
    loggingService.debug('Using presentation settings', settings, 'viewer');
    
    // Apply font settings
    const hasPro = await configManager.hasPro();
    if (hasPro) {
      // For PRO users, apply their custom font selections (or theme defaults if 'default' is selected)
      await applyCustomFonts(config.headingFont, config.contentFont, config.theme);
    } else {
      // For free users, always use theme default fonts
      await applyCustomFonts('default', 'default', config.theme); 
    }
    
    // Create and initialize the renderer
    const renderer = new PresentationRenderer({
      containerId: 'slideContainer',
      ...settings
    });
    
    // Load and render slides
    await renderer.loadAndRender();
    
    // Show keyboard shortcut hints for new presentation
    KeyboardHints.showHints();
    
    // Check for PDF export mode
    if (await PdfExporter.handlePrintMode()) {
      return; 
    }
    // Log completion
    loggingService.debug('Viewer ready', null, 'viewer');
  } catch (error) {
    // Log the error
    loggingService.error('Viewer initialization failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      context: 'viewer_initialization'
    });
    
    alert('Error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Start initialization based on DOM readiness
if (document.readyState === 'loading') {
  // Document still loading, wait for it to finish
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch(error => {
      loggingService.error('Failed to initialize viewer', error, 'viewer');
    });
  });
} else {
  // Document already loaded, initialize immediately
  initialize().catch(error => {
    loggingService.error('Failed to initialize viewer', error, 'viewer');
  });
}
