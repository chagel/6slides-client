/**
 * Tests for Notion Subslide Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { SubslideExtractor } from '../../../src/models/extractors/notion/subslide_extractor';
import { loggingService } from '../../../src/services/logging_service';

describe('SubslideExtractor', () => {
  // Setup and teardown
  let extractor: SubslideExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new SubslideExtractor(mockDocument);
  });

  describe('isSubslideHeading', () => {
    test('should identify HTML h2 element as subslide heading', () => {
      const h2 = document.createElement('h2');
      h2.textContent = 'Subslide Heading';
      expect(extractor.isSubslideHeading(h2)).toBe(true);
    });

    test('should identify Notion sub_header-block element as subslide heading', () => {
      const div = document.createElement('div');
      div.className = 'notion-sub_header-block';
      div.textContent = 'Notion Subslide Heading';
      expect(extractor.isSubslideHeading(div)).toBe(true);
    });

    test('should identify Notion h2 element as subslide heading', () => {
      const div = document.createElement('div');
      div.className = 'notion-h2';
      div.textContent = 'Notion H2 Subslide';
      expect(extractor.isSubslideHeading(div)).toBe(true);
    });

    test('should not identify h1 elements as subslide headings', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Main Slide';
      expect(extractor.isSubslideHeading(h1)).toBe(false);
    });

    test('should not identify regular paragraph elements as subslide headings', () => {
      const p = document.createElement('p');
      p.textContent = 'Not a subslide heading';
      expect(extractor.isSubslideHeading(p)).toBe(false);
    });
  });

  describe('findSubslideHeadings', () => {
    test('should find all subslide headings between two elements', () => {
      // Create a test document structure
      document.body.innerHTML = `
        <h1>Main Slide</h1>
        <p>Main slide content</p>
        <h2>First Subslide</h2>
        <p>First subslide content</p>
        <div class="notion-sub_header-block">Second Subslide</div>
        <p>Second subslide content</p>
        <div class="notion-h2">Third Subslide</div>
        <p>Third subslide content</p>
        <h1>Next Main Slide</h1>
      `;

      const startElement = document.querySelector('h1');
      const endElement = document.querySelectorAll('h1')[1];
      
      const subslideHeadings = extractor.findSubslideHeadings(startElement!, endElement!);
      
      expect(subslideHeadings.length).toBe(3);
      expect(subslideHeadings[0].textContent).toBe('First Subslide');
      expect(subslideHeadings[1].textContent).toBe('Second Subslide');
      expect(subslideHeadings[2].textContent).toBe('Third Subslide');
    });

    test('should return empty array when no subslide headings exist', () => {
      document.body.innerHTML = `
        <h1>Main Slide</h1>
        <p>Content with no subslides</p>
        <ul><li>List item</li></ul>
        <h1>Next Slide</h1>
      `;

      const startElement = document.querySelector('h1');
      const endElement = document.querySelectorAll('h1')[1];
      
      const subslideHeadings = extractor.findSubslideHeadings(startElement!, endElement!);
      
      expect(subslideHeadings.length).toBe(0);
    });

    test('should handle the case when endElement is null (last slide)', () => {
      document.body.innerHTML = `
        <h1>Last Main Slide</h1>
        <p>Content</p>
        <h2>Subslide in Last Slide</h2>
        <p>Subslide content</p>
      `;

      const startElement = document.querySelector('h1');
      
      const subslideHeadings = extractor.findSubslideHeadings(startElement!, null);
      
      expect(subslideHeadings.length).toBe(1);
      expect(subslideHeadings[0].textContent).toBe('Subslide in Last Slide');
    });
  });

  describe('getSubslideTitle', () => {
    test('should extract plain title from h2 element', () => {
      const h2 = document.createElement('h2');
      h2.textContent = 'Simple Subslide Title';
      
      expect(extractor.getSubslideTitle(h2)).toBe('Simple Subslide Title');
    });

    test('should clean title with Heading 2 prefix', () => {
      const div = document.createElement('div');
      div.className = 'notion-sub_header-block';
      div.textContent = 'Heading 2: My Subslide';
      
      expect(extractor.getSubslideTitle(div)).toBe('My Subslide');
    });

    test('should handle titles with Heading 2 prefix without colon', () => {
      const div = document.createElement('div');
      div.className = 'notion-h2';
      div.textContent = 'Heading 2 My Subslide';
      
      expect(extractor.getSubslideTitle(div)).toBe('My Subslide');
    });

    test('should handle titles with no prefix', () => {
      const div = document.createElement('div');
      div.className = 'notion-sub_header-block';
      div.textContent = 'Just a Regular Title';
      
      expect(extractor.getSubslideTitle(div)).toBe('Just a Regular Title');
    });
  });
});