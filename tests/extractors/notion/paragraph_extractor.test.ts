/**
 * Tests for Notion Paragraph Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ParagraphExtractor } from '../../../src/models/extractors/notion/paragraph_extractor';

describe('ParagraphExtractor', () => {
  // Setup and teardown
  let extractor: ParagraphExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new ParagraphExtractor(mockDocument);
  });

  describe('isParagraph', () => {
    test('should identify p element', () => {
      const p = document.createElement('p');
      p.textContent = 'Test paragraph';
      expect(extractor.isParagraph(p)).toBe(true);
    });

    test('should identify Notion text block by notion-text-block class', () => {
      const div = document.createElement('div');
      div.className = 'notion-text-block';
      div.textContent = 'Notion text block';
      expect(extractor.isParagraph(div)).toBe(true);
    });

    test('should identify Notion text by notion-text class', () => {
      const div = document.createElement('div');
      div.className = 'notion-text';
      div.textContent = 'Notion text';
      expect(extractor.isParagraph(div)).toBe(true);
    });

    test('should not identify non-paragraph elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Not a paragraph';
      expect(extractor.isParagraph(div)).toBe(false);
    });
  });

  describe('paragraphToMarkdown', () => {
    test('should convert simple paragraph to markdown', () => {
      const p = document.createElement('p');
      p.textContent = 'Simple paragraph text';
      expect(extractor.paragraphToMarkdown(p)).toBe('Simple paragraph text');
    });

    test('should handle bold formatting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Text with <strong>bold</strong> word';
      
      expect(extractor.paragraphToMarkdown(p)).toBe('Text with **bold** word');
    });

    test('should handle italic formatting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Text with <em>italic</em> word';
      
      expect(extractor.paragraphToMarkdown(p)).toBe('Text with *italic* word');
    });

    test('should handle code/inline code formatting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Text with <code>inline code</code>';
      
      expect(extractor.paragraphToMarkdown(p)).toBe('Text with `inline code`');
    });

    test('should handle multiple formatting styles', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Text with <strong>bold</strong> and <em>italic</em> and <code>code</code>';
      
      expect(extractor.paragraphToMarkdown(p)).toBe('Text with **bold** and *italic* and `code`');
    });

    test('should handle nested formatting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Text with <strong>bold and <em>bold-italic</em></strong>';
      
      // This test checks basic nested formatting - the actual implementation
      // might be more complex depending on how text node traversal is done
      expect(extractor.paragraphToMarkdown(p)).toMatch(/Text with \*\*bold and .+bold-italic.+\*\*/);
    });

    test('should return empty string for empty paragraph', () => {
      const p = document.createElement('p');
      p.textContent = '';
      expect(extractor.paragraphToMarkdown(p)).toBe('');
    });

    test('should return empty string for whitespace-only paragraph', () => {
      const p = document.createElement('p');
      p.textContent = '   ';
      expect(extractor.paragraphToMarkdown(p)).toBe('');
    });
  });

  describe('extractParagraphs', () => {
    test('should find all p elements', () => {
      document.body.innerHTML = `
        <p>First paragraph</p>
        <p>Second paragraph</p>
        <div>Not a paragraph</div>
      `;
      
      const paragraphs = extractor.extractParagraphs();
      expect(paragraphs.length).toBe(2);
    });

    test('should find all Notion text blocks', () => {
      document.body.innerHTML = `
        <div class="notion-text-block">First Notion text block</div>
        <div class="notion-text">Second Notion text</div>
        <div>Not a text block</div>
      `;
      
      const paragraphs = extractor.extractParagraphs();
      expect(paragraphs.length).toBe(2);
    });

    test('should find both HTML p and Notion text blocks', () => {
      document.body.innerHTML = `
        <p>HTML paragraph</p>
        <div class="notion-text-block">Notion text block</div>
        <div>Not a paragraph</div>
      `;
      
      const paragraphs = extractor.extractParagraphs();
      expect(paragraphs.length).toBe(2);
    });

    test('should return empty array when no paragraphs exist', () => {
      document.body.innerHTML = `
        <div>Just a div</div>
        <span>Just a span</span>
      `;
      
      const paragraphs = extractor.extractParagraphs();
      expect(paragraphs.length).toBe(0);
    });
  });
});