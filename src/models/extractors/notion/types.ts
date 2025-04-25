/**
 * Type definitions for Notion Extractors
 */

/**
 * Interface for heading extractor methods
 */
export interface IHeadingExtractor {
  isHeadingElement(element: Element, level: number): boolean;
  headingToMarkdown(element: Element, level: number): string;
  // Optional methods - not all extractors implement all methods
  extractHeadings?(): Element[];
}

/**
 * Interface for list extractor methods
 */
export interface IListExtractor {
  isList(element: Element): boolean;
  listToMarkdown(element: Element): string;
  extractLists?(): Element[];
}

/**
 * Interface for code block extractor methods
 */
export interface ICodeBlockExtractor {
  isCodeBlock(element: Element): boolean;
  codeBlockToMarkdown(element: Element): string;
  extractCodeBlocks?(): Element[];
}

/**
 * Interface for table extractor methods
 */
export interface ITableExtractor {
  isTableElement(element: Element): boolean;
  tableToMarkdown(element: Element): string;
  notionTableToMarkdown(element: Element): string;
}

/**
 * Interface for blockquote extractor methods
 */
export interface IBlockquoteExtractor {
  isBlockquote(element: Element): boolean;
  blockquoteToMarkdown(element: Element): string;
  extractBlockquotes?(): Element[];
}

/**
 * Interface for paragraph extractor methods
 */
export interface IParagraphExtractor {
  isParagraph(element: Element): boolean;
  paragraphToMarkdown(element: Element): string;
}

/**
 * Interface for image extractor methods
 */
export interface IImageExtractor {
  isImage(element: Element): boolean;
  imageToMarkdown(element: Element): string;
  extractImages?(): Element[];
}

/**
 * Interface for subslide extractor methods
 */
export interface ISubslideExtractor {
  isSubslideHeading(element: Element): boolean;
  findSubslideHeadings(startElement: Element, endElement: Element | null): Element[];
  getSubslideTitle(element: Element): string;
}