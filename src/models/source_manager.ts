/**
 * Six Slides - Source Manager
 * 
 * Detects and manages different content sources for extraction
 */

import { loggingService } from '../services/logging_service';
import { NotionExtractor } from './extractors/notion/notion_extractor';
import { MarkdownExtractor } from './extractors/markdown/markdown_extractor';
import { BaseExtractor } from './extractors/base_extractor';

/**
 * Available content source types
 */
export enum SourceType {
  NOTION = 'notion',
  MARKDOWN = 'markdown',
  GITHUB_MARKDOWN = 'github-markdown',
  GITLAB_MARKDOWN = 'gitlab-markdown',
  RENDERED_MARKDOWN = 'rendered-markdown',
  UNKNOWN = 'unknown'
}

/**
 * Source Manager class
 * Detects content sources and provides appropriate extractors
 */
class SourceManager {
  /**
   * Detect the content source type based on the document and URL
   * @param document - The document object
   * @param url - The page URL
   * @returns The source type or null if unknown
   */
  detectSource(document: Document, url: string): SourceType | null {
    loggingService.debug('Detecting source type for:', url);
    
    // Check for Notion
    if (url.includes('notion.so') || url.includes('notion.site')) {
      loggingService.debug('Detected Notion source');
      return SourceType.NOTION;
    }
    
    // Check for Markdown file
    if (url.endsWith('.md') || url.endsWith('.markdown')) {
      loggingService.debug('Detected raw Markdown file source');
      return SourceType.MARKDOWN;
    }

    // Check for GitHub markdown
    if (url.includes('github.com') && document.querySelector('.markdown-body')) {
      loggingService.debug('Detected GitHub markdown source');
      return SourceType.GITHUB_MARKDOWN;
    }
    
    // Check for GitLab markdown
    if (url.includes('gitlab.com') && document.querySelector('.md-content, .wiki-content')) {
      loggingService.debug('Detected GitLab markdown source');
      return SourceType.GITLAB_MARKDOWN;
    }
    
    // Check for generic rendered markdown
    if (document.querySelector('.markdown, .markdown-body, .md-content')) {
      loggingService.debug('Detected generic rendered markdown source');
      return SourceType.RENDERED_MARKDOWN;
    }
    
    // Future: Add more source type detection here
    
    loggingService.debug('Unknown source type');
    return null;
  }
  
  /**
   * Get the appropriate extractor for the source type
   * @param sourceType - The source type
   * @param document - The document object
   * @returns The extractor instance
   */
  getExtractor(sourceType: SourceType | string, document: Document): BaseExtractor {
    loggingService.debug('Getting extractor for:', sourceType);
    
    switch (sourceType) {
      case SourceType.NOTION:
        return new NotionExtractor(document);
      case SourceType.MARKDOWN:
      case SourceType.GITHUB_MARKDOWN:
      case SourceType.GITLAB_MARKDOWN:
      case SourceType.RENDERED_MARKDOWN:
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
export const source_manager = new SourceManager();