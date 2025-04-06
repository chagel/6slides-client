/**
 * Tests for Notion Blockquote Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { BlockquoteExtractor } from '../../../src/models/extractors/notion/blockquoteExtractor';

describe('BlockquoteExtractor', () => {
  // Setup and teardown
  let extractor: BlockquoteExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new BlockquoteExtractor(mockDocument);
  });

  describe('isBlockquote', () => {
    test('should identify HTML blockquote element', () => {
      const quote = document.createElement('blockquote');
      quote.textContent = 'A classic quote';
      expect(extractor.isBlockquote(quote)).toBe(true);
    });

    test('should identify Notion blockquote by notion-quote-block class', () => {
      const div = document.createElement('div');
      div.className = 'notion-quote-block';
      div.textContent = 'A Notion quote';
      expect(extractor.isBlockquote(div)).toBe(true);
    });

    test('should identify Notion blockquote by notion-quote class', () => {
      const div = document.createElement('div');
      div.className = 'notion-quote';
      div.textContent = 'Another Notion quote';
      expect(extractor.isBlockquote(div)).toBe(true);
    });

    test('should not identify non-blockquote elements', () => {
      const p = document.createElement('p');
      p.textContent = 'Not a blockquote';
      expect(extractor.isBlockquote(p)).toBe(false);
    });
  });

  describe('blockquoteToMarkdown', () => {
    test('should convert simple blockquote to markdown', () => {
      const quote = document.createElement('blockquote');
      quote.textContent = 'A single line quote';
      expect(extractor.blockquoteToMarkdown(quote)).toBe('> A single line quote');
    });

    test('should handle multi-line blockquotes', () => {
      const quote = document.createElement('blockquote');
      quote.innerHTML = 'First line<br>Second line';
      
      // In JSDOM, we need to simulate how innerText would split on <br>
      jest.spyOn(extractor, 'getElementText').mockReturnValue('First line\nSecond line');
      
      const result = extractor.blockquoteToMarkdown(quote);
      expect(result).toBe('> First line\n> Second line');
    });

    test('should handle empty blockquotes', () => {
      const quote = document.createElement('blockquote');
      quote.textContent = '';
      expect(extractor.blockquoteToMarkdown(quote)).toBe('> ');
    });
  });

  describe('extractBlockquotes', () => {
    test('should find all HTML blockquote elements', () => {
      document.body.innerHTML = `
        <blockquote>First quote</blockquote>
        <blockquote>Second quote</blockquote>
        <p>Not a quote</p>
      `;
      
      const quotes = extractor.extractBlockquotes();
      expect(quotes.length).toBe(2);
    });

    test('should find all Notion blockquote elements', () => {
      document.body.innerHTML = `
        <div class="notion-quote-block">First Notion quote</div>
        <div class="notion-quote">Second Notion quote</div>
        <p>Not a quote</p>
      `;
      
      const quotes = extractor.extractBlockquotes();
      expect(quotes.length).toBe(2);
    });

    test('should find both HTML and Notion blockquotes', () => {
      document.body.innerHTML = `
        <blockquote>HTML quote</blockquote>
        <div class="notion-quote-block">Notion quote</div>
        <p>Not a quote</p>
      `;
      
      const quotes = extractor.extractBlockquotes();
      expect(quotes.length).toBe(2);
    });

    test('should return empty array when no blockquotes exist', () => {
      document.body.innerHTML = `
        <p>Just a paragraph</p>
        <div>Just a div</div>
      `;
      
      const quotes = extractor.extractBlockquotes();
      expect(quotes.length).toBe(0);
    });
  });
});