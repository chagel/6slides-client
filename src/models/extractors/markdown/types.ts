/**
 * Type definitions for Markdown Extractors
 */

export interface IMarkdownExtractor {
  extract(): any[];
  findMarkdownContainer(): Element | null;
  extractFromRenderedMarkdown(container: Element): any[];
  extractContentBetweenHeadings(currentHeading: Element, nextHeading: Element | null, container: Element): string;
  convertTableToMarkdown(table: Element): string;
  extractFromRawMarkdown(): any[];
  cleanMarkdown(markdown: string): string;
  parseAlternativeMarkdownFormat(rawMarkdown: string): any[];
}