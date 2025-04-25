/**
 * Tests for Notion Heading Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { HeadingExtractor } from '../../../src/models/extractors/notion/heading_extractor';
import { loggingService } from '../../../src/services/logging_service';

describe('HeadingExtractor', () => {
  // Setup and teardown
  let extractor: HeadingExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new HeadingExtractor(mockDocument);
  });

  describe('isHeadingElement', () => {
    test('should identify HTML h1 element', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Heading 1';
      expect(extractor.isHeadingElement(h1, 1)).toBe(true);
    });

    test('should identify HTML h2 element', () => {
      const h2 = document.createElement('h2');
      h2.textContent = 'Heading 2';
      expect(extractor.isHeadingElement(h2, 2)).toBe(true);
    });

    test('should identify Notion h1 element by class', () => {
      const div = document.createElement('div');
      div.className = 'notion-header-block';
      div.textContent = 'Notion H1';
      expect(extractor.isHeadingElement(div, 1)).toBe(true);
    });

    test('should identify Notion h2 element by class', () => {
      const div = document.createElement('div');
      div.className = 'notion-sub_header-block';
      div.textContent = 'Notion H2';
      expect(extractor.isHeadingElement(div, 2)).toBe(true);
    });

    test('should not identify non-heading elements', () => {
      const p = document.createElement('p');
      p.textContent = 'Not a heading';
      expect(extractor.isHeadingElement(p, 1)).toBe(false);
      expect(extractor.isHeadingElement(p, 2)).toBe(false);
      expect(extractor.isHeadingElement(p, 3)).toBe(false);
    });
  });

  describe('headingToMarkdown', () => {
    test('should convert h1 to markdown', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Heading 1';
      expect(extractor.headingToMarkdown(h1, 1)).toBe('# Heading 1');
    });

    test('should convert h2 to markdown', () => {
      const h2 = document.createElement('h2');
      h2.textContent = 'Heading 2';
      expect(extractor.headingToMarkdown(h2, 2)).toBe('## Heading 2');
    });

    test('should convert h3 to markdown', () => {
      const h3 = document.createElement('h3');
      h3.textContent = 'Heading 3';
      expect(extractor.headingToMarkdown(h3, 3)).toBe('### Heading 3');
    });
  });

});