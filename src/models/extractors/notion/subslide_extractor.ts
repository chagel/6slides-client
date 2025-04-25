/**
 * Six Slides - Subslide Extractor
 * 
 * Extracts subslide elements from Notion pages
 */

import { BaseExtractor } from '../base_extractor';
import { ISubslideExtractor } from './types';
import { loggingService } from '../../../services/logging_service';

export class SubslideExtractor extends BaseExtractor implements ISubslideExtractor {
  /**
   * Constructor
   * @param document - The document to extract from
   */
  constructor(document: Document) {
    super(document);
  }

  /**
   * Check if an element is a subslide heading (H2)
   * @param element - Element to check
   * @returns True if element is a subslide heading
   */
  isSubslideHeading(element: Element): boolean {
    // Detailed logging for debugging
    const elementInfo = {
      tagName: element.tagName,
      className: element.className,
      textContent: element.textContent?.trim().substring(0, 50),
      outerHTML: element.outerHTML?.substring(0, 100)
    };
    
    // Standard HTML H2
    if (element.tagName === 'H2') {
      loggingService.debug('Found H2 subslide heading by tag name', elementInfo);
      return true;
    }
    
    // Notion-specific subheading classes
    const notionSubHeaderClass = 'notion-sub_header-block';
    const notionH2Class = 'notion-h2';
    
    // Check for Notion-specific classes
    const hasNotionSubHeaderClass = this.hasClass(element, notionSubHeaderClass);
    const hasNotionH2Class = element.className && element.className.includes(notionH2Class);
    
    // Removed verbose class checks to focus on key subslide detection
    
    // Also check if the text content starts with "Heading 2:" which is common in Notion
    // OR check for any element that contains text like "Heading 2" or "Subheading"
    const hasHeading2Prefix = element.textContent && 
                             (/^Heading\s+2\s*[:]?/i.test(element.textContent) || 
                              /Subheading/i.test(element.textContent));
    
    if (hasHeading2Prefix) {
      loggingService.debug('Found potential subslide by heading prefix text', {
        ...elementInfo,
        headingText: element.textContent?.trim()
      });
    }
    
    if (hasNotionSubHeaderClass || hasNotionH2Class || hasHeading2Prefix) {
      loggingService.debug('Found Notion subslide heading', {
        ...elementInfo,
        matchType: hasNotionSubHeaderClass ? 'notionSubHeaderClass' : 
                  hasNotionH2Class ? 'notionH2Class' : 'headingPrefix'
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * Find all subslide headings between two elements
   * @param startElement - Starting element (usually an H1)
   * @param endElement - Ending element (next H1 or null)
   * @returns Array of subslide heading elements
   */
  findSubslideHeadings(startElement: Element, endElement: Element | null): Element[] {
    const subslideHeadings: Element[] = [];
    let currentElement = startElement.nextElementSibling;
    
    // Log for debugging
    loggingService.debug('Starting search for subslide headings', {
      startElement: {
        tagName: startElement.tagName,
        className: startElement.className,
        textContent: startElement.textContent?.trim()
      },
      endElement: endElement ? {
        tagName: endElement.tagName,
        className: endElement.className,
        textContent: endElement.textContent?.trim()
      } : 'null'
    });
    
    let elementsChecked = 0;
    while (currentElement && currentElement !== endElement) {
      elementsChecked++;
      
      // Focus debugging specifically on subslide detection
      
      if (this.isSubslideHeading(currentElement)) {
        subslideHeadings.push(currentElement);
        loggingService.debug(`Found subslide heading: ${this.getElementText(currentElement)}`, {
          element: {
            tagName: currentElement.tagName,
            className: currentElement.className
          }
        });
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    loggingService.debug(`Subslide search complete. Found ${subslideHeadings.length} subslides after checking ${elementsChecked} elements.`);
    
    return subslideHeadings;
  }
  
  /**
   * Get the title of a subslide heading element
   * @param element - Subslide heading element
   * @returns The cleaned title text
   */
  getSubslideTitle(element: Element): string {
    let originalTitle = this.getElementText(element).trim();
    
    // Handle Notion's "Heading 2:" prefix in subheadings
    let cleanedTitle = originalTitle.replace(/^Heading\s+2\s*[:]*\s*/i, '');
    
    loggingService.debug(`Cleaned subslide title: "${cleanedTitle}"`);    
    
    return cleanedTitle;
  }
  
  /**
   * Extract method implementation (required by BaseExtractor)
   * @returns Empty array (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    return [];
  }
}
