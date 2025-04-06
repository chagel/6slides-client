/**
 * Notion to Slides - Table Extractor
 * 
 * Extracts table elements from documents and converts to markdown format
 */

import { loggingService } from '../../../services/LoggingService.js';
import { BaseExtractor } from '../baseExtractor.js';

export class TableExtractor extends BaseExtractor {
  /**
   * Convert a table element to markdown
   * @param table - The table element
   * @returns Markdown table representation
   */
  tableToMarkdown(table: Element): string {
    try {
      // Try to handle both standard HTML tables and Notion's custom table format
      const rows = Array.from(table.querySelectorAll('tr'));
      
      // If no rows are found, this might be a Notion-style table with div structure
      if (!rows.length) {
        return this.notionTableToMarkdown(table);
      }
      
      const markdownRows: string[] = [];
      
      // Process header row
      const headerRow = rows[0];
      const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
      if (!headerCells.length) return '';
      
      // Clean header cell content and ensure it's valid for markdown table
      markdownRows.push('| ' + headerCells.map(cell => {
        const text = this.getElementText(cell).replace(/\|/g, '\\|').trim() || ' ';
        return text; 
      }).join(' | ') + ' |');
      
      // Add separator row
      markdownRows.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
      
      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length) {
          markdownRows.push('| ' + cells.map(cell => {
            const text = this.getElementText(cell).replace(/\|/g, '\\|').trim() || ' ';
            return text;
          }).join(' | ') + ' |');
        }
      }
      
      return markdownRows.join('\n');
    } catch (error) {
      loggingService.error('Error converting table to markdown', error);
      return '';
    }
  }
  
  /**
   * Convert a Notion-style table (div structure) to markdown
   * @param tableContainer - The Notion table container element
   * @returns Markdown table representation
   */
  notionTableToMarkdown(tableContainer: Element): string {
    try {
      // Notion tables might be structured as div grids rather than table elements
      const rows = Array.from(tableContainer.children);
      if (!rows.length) return '';
      
      const markdownRows: string[] = [];
      let columnCount = 0;
      
      // Determine the column count by checking the first row
      if (rows[0].children) {
        columnCount = rows[0].children.length;
      }
      
      if (columnCount === 0) return '';
      
      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const cells = Array.from(rows[i].children);
        const rowData: string[] = [];
        
        // Process each cell in the row
        for (let j = 0; j < cells.length; j++) {
          const text = this.getElementText(cells[j]).replace(/\|/g, '\\|').trim() || ' ';
          rowData.push(text);
        }
        
        // Ensure all rows have the same number of columns
        while (rowData.length < columnCount) {
          rowData.push(' ');
        }
        
        // Add row to markdown table
        markdownRows.push('| ' + rowData.join(' | ') + ' |');
        
        // Add separator row after the first row
        if (i === 0) {
          markdownRows.push('| ' + Array(columnCount).fill('---').join(' | ') + ' |');
        }
      }
      
      return markdownRows.join('\n');
    } catch (error) {
      loggingService.error('Error converting Notion table to markdown', error);
      return '';
    }
  }
  
  /**
   * Detect if an element is a table
   * @param element - Element to check
   * @returns True if element is a table
   */
  isTableElement(element: Element): boolean {
    // First, check if this is a blockquote - if so, it's NOT a table
    // This prevents blockquotes from being misidentified as tables
    if (element.tagName === 'BLOCKQUOTE' || 
        this.hasClass(element, 'notion-quote-block') ||
        this.hasClass(element, 'notion-quote')) {
      return false;
    }
    
    // Standard HTML table
    if (element.tagName === 'TABLE') {
      return true;
    }
    
    // Notion tables are sometimes in containers with specific classes
    if (this.hasClass(element, 'notion-table') || 
        this.hasClass(element, 'notion-collection-table')) {
      return true;
    }
    
    // Check if this might be a DIV-based table (Notion sometimes does this)
    // by seeing if it has multiple child divs arranged in a grid
    if (element.tagName === 'DIV' && 
        element.children.length > 0 && 
        element.children[0].children && 
        element.children[0].children.length > 1) {
      
      // Check if the structure looks like rows and cells
      const firstRowChildCount = element.children[0].children.length;
      
      // Check if multiple rows have the same number of children (cells)
      let isTableLike = true;
      for (let i = 1; i < Math.min(element.children.length, 3); i++) {
        if (element.children[i].children && 
            element.children[i].children.length === firstRowChildCount) {
          continue;
        }
        isTableLike = false;
        break;
      }
      
      return isTableLike;
    }
    
    return false;
  }
  
  /**
   * Extract method implementation
   * @returns Array of slide objects (not used directly for this extractor)
   */
  extract() {
    // This method is required by BaseExtractor but not directly used
    // since table extraction is typically part of a larger extraction process
    return [];
  }
}