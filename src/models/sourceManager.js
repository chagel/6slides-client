/**
 * Notion to Slides - Source Manager
 * 
 * Detects and manages different content sources for extraction
 */

import { logDebug, logError } from '../common/utils.js';
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
    logDebug('Detecting source type for:', url);
    
    // Check for Notion
    if (url.includes('notion.so') || url.includes('notion.site')) {
      logDebug('Detected Notion source');
      return 'notion';
    }
    
    // Check for Markdown file
    if (url.endsWith('.md') || url.endsWith('.markdown')) {
      logDebug('Detected raw Markdown file source');
      return 'markdown';
    }

    // Check for GitHub markdown
    if (url.includes('github.com') && document.querySelector('.markdown-body')) {
      logDebug('Detected GitHub markdown source');
      return 'github-markdown';
    }
    
    // Check for GitLab markdown
    if (url.includes('gitlab.com') && document.querySelector('.md-content, .wiki-content')) {
      logDebug('Detected GitLab markdown source');
      return 'gitlab-markdown';
    }
    
    // Check for generic rendered markdown
    if (document.querySelector('.markdown, .markdown-body, .md-content')) {
      logDebug('Detected generic rendered markdown source');
      return 'rendered-markdown';
    }
    
    // Future: Add more source type detection here
    
    logDebug('Unknown source type');
    return null;
  }
  
  /**
   * Get the appropriate extractor for the source type
   * @param {string} sourceType - The source type
   * @param {Document} document - The document object
   * @returns {BaseExtractor} - The extractor instance
   */
  getExtractor(sourceType, document) {
    logDebug('Getting extractor for:', sourceType);
    
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
        logError('Failed to get extractor', error);
        throw error;
      }
    }
  }
}

// Export a singleton instance
export const sourceManager = new SourceManager();