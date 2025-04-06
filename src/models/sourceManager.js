/**
 * Notion to Slides - Source Manager
 * 
 * Detects and manages different content sources for extraction
 */

import { loggingService } from '../services/LoggingService.js';
import { NotionExtractor } from './extractors/notion/notionExtractor.js';
import { MarkdownExtractor } from './extractors/markdown/markdownExtractor.js';

/**
 * Source Manager class
 * Detects content sources and provides appropriate extractors
 */
class SourceManager {
  /**
   * Detect the content source type based on the document and URL
   * @param {Document} document - The document object
   * @param {string} url - The page URL
   * @returns {string|null} - The source type or null if unknown
   */
  detectSource(document, url) {
    loggingService.debug('Detecting source type for:', url);
    
    // Check for Notion
    if (url.includes('notion.so') || url.includes('notion.site')) {
      loggingService.debug('Detected Notion source');
      return 'notion';
    }
    
    // Check for Markdown file
    if (url.endsWith('.md') || url.endsWith('.markdown')) {
      loggingService.debug('Detected raw Markdown file source');
      return 'markdown';
    }

    // Check for GitHub markdown
    if (url.includes('github.com') && document.querySelector('.markdown-body')) {
      loggingService.debug('Detected GitHub markdown source');
      return 'github-markdown';
    }
    
    // Check for GitLab markdown
    if (url.includes('gitlab.com') && document.querySelector('.md-content, .wiki-content')) {
      loggingService.debug('Detected GitLab markdown source');
      return 'gitlab-markdown';
    }
    
    // Check for generic rendered markdown
    if (document.querySelector('.markdown, .markdown-body, .md-content')) {
      loggingService.debug('Detected generic rendered markdown source');
      return 'rendered-markdown';
    }
    
    // Future: Add more source type detection here
    
    loggingService.debug('Unknown source type');
    return null;
  }
  
  /**
   * Get the appropriate extractor for the source type
   * @param {string} sourceType - The source type
   * @param {Document} document - The document object
   * @returns {BaseExtractor} - The extractor instance
   */
  getExtractor(sourceType, document) {
    loggingService.debug('Getting extractor for:', sourceType);
    
    switch (sourceType) {
      case 'notion':
        return new NotionExtractor(document);
      case 'markdown':
        return new MarkdownExtractor(document);
      case 'github-markdown':
        return new MarkdownExtractor(document);
      // Future: Add more extractors here
      default: {
        const error = new Error(`Unsupported source type: ${sourceType}`);
        loggingService.error('Failed to get extractor', error);
        throw error;
      }
    }
  }
}

// Export a singleton instance
export const sourceManager = new SourceManager();