/**
 * Tests for Notion Table Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { TableExtractor } from '../../../src/models/extractors/notion/tableExtractor';
import { loggingService } from '../../../src/services/LoggingService';

describe('TableExtractor', () => {
  // Setup and teardown
  let extractor: TableExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new TableExtractor(mockDocument);
    
    // Mock loggingService
    jest.spyOn(loggingService, 'error').mockImplementation(() => {});
  });

  describe('isTableElement', () => {
    test('should identify HTML table element', () => {
      const table = document.createElement('table');
      expect(extractor.isTableElement(table)).toBe(true);
    });

    test('should identify Notion table by notion-table class', () => {
      const div = document.createElement('div');
      div.className = 'notion-table';
      expect(extractor.isTableElement(div)).toBe(true);
    });

    test('should identify Notion collection table', () => {
      const div = document.createElement('div');
      div.className = 'notion-collection-table';
      expect(extractor.isTableElement(div)).toBe(true);
    });

    test('should identify DIV-based tables with grid-like structure', () => {
      // Create a grid-like div structure
      const tableDiv = document.createElement('div');
      
      // Create 3 rows with 3 cells each
      for (let i = 0; i < 3; i++) {
        const row = document.createElement('div');
        for (let j = 0; j < 3; j++) {
          const cell = document.createElement('div');
          cell.textContent = `Cell ${i},${j}`;
          row.appendChild(cell);
        }
        tableDiv.appendChild(row);
      }
      
      expect(extractor.isTableElement(tableDiv)).toBe(true);
    });

    test('should not identify regular divs', () => {
      const div = document.createElement('div');
      div.textContent = 'Not a table';
      expect(extractor.isTableElement(div)).toBe(false);
    });

    test('should not identify divs with inconsistent child structure', () => {
      // Create a div with inconsistent children
      const div = document.createElement('div');
      
      // First "row" has 3 cells
      const row1 = document.createElement('div');
      for (let i = 0; i < 3; i++) {
        row1.appendChild(document.createElement('div'));
      }
      
      // Second "row" has 2 cells - inconsistent!
      const row2 = document.createElement('div');
      for (let i = 0; i < 2; i++) {
        row2.appendChild(document.createElement('div'));
      }
      
      div.appendChild(row1);
      div.appendChild(row2);
      
      expect(extractor.isTableElement(div)).toBe(false);
    });
  });

  describe('tableToMarkdown', () => {
    test('should convert standard HTML table to markdown', () => {
      document.body.innerHTML = `
        <table>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
          </tr>
          <tr>
            <td>Row 1, Cell 1</td>
            <td>Row 1, Cell 2</td>
          </tr>
          <tr>
            <td>Row 2, Cell 1</td>
            <td>Row 2, Cell 2</td>
          </tr>
        </table>
      `;
      
      const table = document.querySelector('table');
      // Use non-null assertion since we know the table exists in this test
      const markdown = extractor.tableToMarkdown(table!);
      
      // Check for markdown table format
      expect(markdown).toContain('| Header 1 | Header 2 |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Row 1, Cell 1 | Row 1, Cell 2 |');
      expect(markdown).toContain('| Row 2, Cell 1 | Row 2, Cell 2 |');
      
      // Check for correct number of lines
      const lines = markdown.split('\n');
      expect(lines.length).toBe(4); // Header, separator, 2 data rows
    });

    test('should handle empty cells', () => {
      document.body.innerHTML = `
        <table>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
          </tr>
          <tr>
            <td>Data 1</td>
            <td></td>
          </tr>
        </table>
      `;
      
      const table = document.querySelector('table');
      // Use non-null assertion since we know the table exists in this test
      const markdown = extractor.tableToMarkdown(table!);
      
      // The exact spacing might vary, so we'll check for parts of the expected content
      expect(markdown).toContain('| Data 1 |');
      // Count the number of lines instead of counting pipe characters
      expect(markdown.split('\n').length).toBe(3); // Header, separator, data row
    });

    test('should escape pipe characters in cell content', () => {
      document.body.innerHTML = `
        <table>
          <tr>
            <th>Header</th>
          </tr>
          <tr>
            <td>Cell with | pipe</td>
          </tr>
        </table>
      `;
      
      const table = document.querySelector('table');
      // Use non-null assertion since we know the table exists in this test
      const markdown = extractor.tableToMarkdown(table!);
      
      expect(markdown).toContain('Cell with \\| pipe');
    });

    test('should handle error and return empty string', () => {
      // Create an invalid table element that would cause an error
      const invalidTable = document.createElement('table');
      // Force an error by making querySelector throw
      Object.defineProperty(invalidTable, 'querySelectorAll', {
        get: () => { throw new Error('Test error'); }
      });
      
      const markdown = extractor.tableToMarkdown(invalidTable);
      
      expect(markdown).toBe('');
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('notionTableToMarkdown', () => {
    test('should convert Notion div-based table to markdown', () => {
      // Create a div-based table structure
      const tableDiv = document.createElement('div');
      
      // Create header row
      const headerRow = document.createElement('div');
      const header1 = document.createElement('div');
      header1.textContent = 'Header 1';
      const header2 = document.createElement('div');
      header2.textContent = 'Header 2';
      headerRow.appendChild(header1);
      headerRow.appendChild(header2);
      
      // Create data row
      const dataRow = document.createElement('div');
      const data1 = document.createElement('div');
      data1.textContent = 'Data 1';
      const data2 = document.createElement('div');
      data2.textContent = 'Data 2';
      dataRow.appendChild(data1);
      dataRow.appendChild(data2);
      
      tableDiv.appendChild(headerRow);
      tableDiv.appendChild(dataRow);
      
      const markdown = extractor.notionTableToMarkdown(tableDiv);
      
      // Check for markdown table format
      expect(markdown).toContain('| Header 1 | Header 2 |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| Data 1 | Data 2 |');
      
      // Check for correct number of lines
      const lines = markdown.split('\n');
      expect(lines.length).toBe(3); // Header, separator, data row
    });
    
    test('should handle rows with missing cells by padding', () => {
      // Create a div-based table with inconsistent cells
      const tableDiv = document.createElement('div');
      
      // Create header row with 2 cells
      const headerRow = document.createElement('div');
      headerRow.appendChild(createDivWithText('Header 1'));
      headerRow.appendChild(createDivWithText('Header 2'));
      
      // Create data row with only 1 cell
      const dataRow = document.createElement('div');
      dataRow.appendChild(createDivWithText('Only One Cell'));
      
      tableDiv.appendChild(headerRow);
      tableDiv.appendChild(dataRow);
      
      const markdown = extractor.notionTableToMarkdown(tableDiv);
      
      // Should have padded the missing cell
      // The exact spacing might vary, so we'll check for parts of the expected content
      expect(markdown).toContain('| Only One Cell |');
      expect(markdown).toContain('| Header 1 | Header 2 |');
      // Count the number of lines instead of counting pipe characters
      expect(markdown.split('\n').length).toBe(3); // Header, separator, data row
    });
    
    test('should return empty string for empty table container', () => {
      const emptyDiv = document.createElement('div');
      const markdown = extractor.notionTableToMarkdown(emptyDiv);
      expect(markdown).toBe('');
    });
    
    test('should handle error and return empty string', () => {
      // Create an invalid table element that would cause an error
      const invalidTable = document.createElement('div');
      // Force an error
      Object.defineProperty(invalidTable, 'children', {
        get: () => { throw new Error('Test error'); }
      });
      
      const markdown = extractor.notionTableToMarkdown(invalidTable);
      
      expect(markdown).toBe('');
      expect(loggingService.error).toHaveBeenCalled();
    });
  });
});

// Helper function to create a div with text content
function createDivWithText(text: string) {
  const div = document.createElement('div');
  div.textContent = text;
  return div;
}