/**
 * Tests for Main Notion Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { NotionExtractor } from '../../../src/models/extractors/notion/notion_extractor';
import { loggingService } from '../../../src/services/logging_service';

describe('NotionExtractor', () => {
  // Setup and teardown
  let extractor: NotionExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new NotionExtractor(mockDocument);
    
    // Spy on component extractors
    jest.spyOn(extractor.heading_extractor, 'isHeadingElement');
    jest.spyOn(extractor.list_extractor, 'isList');
    jest.spyOn(extractor.code_block_extractor, 'isCodeBlock');
    jest.spyOn(extractor.table_extractor, 'isTableElement');
    jest.spyOn(extractor.blockquote_extractor, 'isBlockquote');
    jest.spyOn(extractor.paragraph_extractor, 'isParagraph');
    jest.spyOn(extractor.image_extractor, 'isImage');
  });

  describe('extract', () => {
    test('should extract slides from Notion content', () => {
      document.body.innerHTML = `
        <h1>First Slide</h1>
        <p>This is the first paragraph.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <h1>Second Slide</h1>
        <p>Second slide content.</p>
        <pre>console.log("Code block");</pre>
      `;
      
      const slides = extractor.extract();
      
      // Verify basic slide structure
      expect(slides).toHaveLength(2);
      expect(slides[0].title).toBe('First Slide');
      expect(slides[1].title).toBe('Second Slide');
      expect(slides[0].sourceType).toBe('notion');
      expect(slides[1].sourceType).toBe('notion');
      
      // Verify content
      expect(slides[0].content).toContain('This is the first paragraph');
      expect(slides[0].content).toContain('Item 1');
      expect(slides[1].content).toContain('Second slide content');
      expect(slides[1].content).toContain('console.log');
    });

    test('should return empty array when no H1 elements exist', () => {
      document.body.innerHTML = `
        <p>Just some content without slide breaks.</p>
        <ul>
          <li>Item in a list</li>
        </ul>
      `;
      
      const slides = extractor.extract();
      expect(slides).toHaveLength(0);
    });
    
    test('should handle special characters and HTML entities', () => {
      document.body.innerHTML = `
        <h1>Slide with &amp; and &lt; characters</h1>
        <p>Text with &nbsp; space and &quot;quotes&quot;.</p>
      `;
      
      const slides = extractor.extract();
      expect(slides).toHaveLength(1);
      expect(slides[0].title).toBe('Slide with & and < characters');
      expect(slides[0].content).toMatch(/Text with\s+space and "quotes"\./);
      // Using regex to handle differences in how JSDOM parses &nbsp;
    });
    
    test('should omit horizontal dividers from slide content', () => {
      document.body.innerHTML = `
        <h1>Slide with Divider</h1>
        <p>Content before divider</p>
        <hr>
        <p>Content after HR divider</p>
        <div class="notion-divider-block"></div>
        <p>Content after Notion divider</p>
      `;
      
      const slides = extractor.extract();
      expect(slides).toHaveLength(1);
      expect(slides[0].title).toBe('Slide with Divider');
      expect(slides[0].content).toContain('Content before divider');
      expect(slides[0].content).toContain('Content after HR divider');
      expect(slides[0].content).toContain('Content after Notion divider');
      // Horizontal rule markdown should NOT be in the content
      expect(slides[0].content).not.toContain('---');
    });
  });

  describe('processElementToMarkdown', () => {
    test('should route elements to appropriate extractors', () => {
      // Create various element types
      const h2 = document.createElement('h2');
      h2.textContent = 'Heading 2';
      document.body.appendChild(h2);
      
      const list = document.createElement('ul');
      list.innerHTML = '<li>Item</li>';
      document.body.appendChild(list);
      
      const codeBlock = document.createElement('pre');
      codeBlock.textContent = 'code';
      document.body.appendChild(codeBlock);
      
      const div = document.createElement('div');
      div.className = 'notion-divider-block';
      document.body.appendChild(div);
      
      // Process each element
      extractor.processElementToMarkdown(h2);
      extractor.processElementToMarkdown(list);
      extractor.processElementToMarkdown(codeBlock);
      extractor.processElementToMarkdown(div);
      
      // Verify the right extractors were called
      expect(extractor.heading_extractor.isHeadingElement).toHaveBeenCalledWith(h2, 2);
      expect(extractor.list_extractor.isList).toHaveBeenCalledWith(list);
      expect(extractor.code_block_extractor.isCodeBlock).toHaveBeenCalledWith(codeBlock);
    });
    
    test('should skip horizontal rules', () => {
      const hr = document.createElement('hr');
      document.body.appendChild(hr);
      
      const result = extractor.processElementToMarkdown(hr);
      expect(result).toBe('');
    });
    
    test('should extract text from unknown elements', () => {
      const span = document.createElement('span');
      span.textContent = 'Just some text';
      document.body.appendChild(span);
      
      const result = extractor.processElementToMarkdown(span);
      expect(result).toBe('Just some text');
    });
  });

  describe('getContentBetweenBreaks', () => {
    test('should collect content between slide breaks', () => {
      document.body.innerHTML = `
        <h1>First Slide</h1>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <h1>Second Slide</h1>
        <p>Next content</p>
      `;
      
      const firstBreak = document.querySelector('h1');
      const secondBreak = document.querySelectorAll('h1')[1];
      
      // Use non-null assertions since we know these elements exist in our test
      const content = extractor.getContentBetweenBreaks(firstBreak!, secondBreak!);
      
      expect(content).toContain('Paragraph 1');
      expect(content).toContain('Paragraph 2');
      expect(content).not.toContain('Next content');
    });
    
    test('should handle content after the last slide break', () => {
      document.body.innerHTML = `
        <h1>Only Slide</h1>
        <p>Content after</p>
        <ul>
          <li>List item</li>
        </ul>
      `;
      
      const slideBreak = document.querySelector('h1');
      // Use non-null assertion and type assertion for null parameter
      const content = extractor.getContentBetweenBreaks(slideBreak!, null as unknown as Element);
      
      expect(content).toContain('Content after');
      expect(content).toContain('List item');
    });
    
    test('should correctly handle blockquotes with table-like structure', () => {
      // Create test HTML with a table followed by a blockquote with div structure
      document.body.innerHTML = `
        <h1>Table and Blockquote Test</h1>
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Data 1</td><td>Data 2</td></tr>
        </table>
        <div class="notion-quote-block">
          <div>
            <div>Quote line 1</div>
            <div></div>
          </div>
          <div>
            <div>Quote line 2</div>
            <div></div>
          </div>
        </div>
      `;
      
      // Check if the blockquote is correctly identified
      const blockquote = document.querySelector('.notion-quote-block');
      // Use non-null assertion since we know it exists in this test
      expect(extractor.blockquote_extractor.isBlockquote(blockquote!)).toBe(true);
      
      // This is the key test - ensure the blockquote is not mistaken for a table
      expect(extractor.table_extractor.isTableElement(blockquote!)).toBe(false);
      
      // Check the extracted content
      const slideBreak = document.querySelector('h1');
      // Pass null as second parameter to test end of document
      const content = extractor.getContentBetweenBreaks(slideBreak!, null as unknown as Element);
      
      // Verify both elements are formatted correctly
      expect(content).toContain('| Header 1 | Header 2 |');
      expect(content).toContain('| Data 1 | Data 2 |');
      expect(content).toContain('> Quote line 1');
      expect(content).toContain('> Quote line 2');
    });
  });
});
