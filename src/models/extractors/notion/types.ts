/**
 * Type definitions for Notion Extractors
 */

/**
 * Interface for heading extractor methods
 */
export interface IHeadingExtractor {
  isHeadingElement(element: Element, level: number): boolean;
  headingToMarkdown(element: Element, level: number): string;
}

/**
 * Interface for list extractor methods
 */
export interface IListExtractor {
  isList(element: Element): boolean;
  listToMarkdown(element: Element): string;
  getIndentationLevel(element: Element): number;
  isOrderedListItem(element: Element): boolean;
  getDirectListText(element: Element): string;
}

/**
 * Interface for code block extractor methods
 */
export interface ICodeBlockExtractor {
  isCodeBlock(element: Element): boolean;
  codeBlockToMarkdown(element: Element): string;
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
}

/**
 * Interface for subslide extractor methods
 */
export interface ISubslideExtractor {
  isSubslideHeading(element: Element): boolean;
  findSubslideHeadings(startElement: Element, endElement: Element | null): Element[];
  getSubslideTitle(element: Element): string;
}