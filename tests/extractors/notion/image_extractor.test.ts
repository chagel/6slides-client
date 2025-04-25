/**
 * Tests for Notion Image Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ImageExtractor } from '../../../src/models/extractors/notion/image_extractor';

describe('ImageExtractor', () => {
  // Setup and teardown
  let extractor: ImageExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new ImageExtractor(mockDocument);
  });

  describe('isImage', () => {
    test('should identify img element', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      expect(extractor.isImage(img)).toBe(true);
    });

    test('should identify element containing an img', () => {
      // Instead of mocking, let's create and test with a real div and img
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.jpg';
      div.appendChild(img);
      
      // Now verify that the method identifies the div as containing an image
      expect(extractor.isImage(div)).toBe(true);
    });

    test('should identify Notion image block', () => {
      const div = document.createElement('div');
      div.className = 'notion-image-block';
      expect(extractor.isImage(div)).toBe(true);
    });

    test('should not identify non-image elements', () => {
      const p = document.createElement('p');
      p.textContent = 'Not an image';
      expect(extractor.isImage(p)).toBe(false);
    });
  });

  describe('imageToMarkdown', () => {
    test('should convert img element to markdown', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      img.alt = 'Example image';
      
      expect(extractor.imageToMarkdown(img)).toBe('![Example image](https://example.com/image.jpg)');
    });

    test('should handle img element without alt text', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      
      expect(extractor.imageToMarkdown(img)).toBe('![Image](https://example.com/image.jpg)');
    });

    test('should extract img from container', () => {
      const div = document.createElement('div');
      div.className = 'notion-image-block';
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      img.alt = 'Nested image';
      div.appendChild(img);
      
      expect(extractor.imageToMarkdown(div)).toBe('![Nested image](https://example.com/image.jpg)');
    });

    test('should return empty string for invalid elements', () => {
      const div = document.createElement('div');
      // No image inside
      expect(extractor.imageToMarkdown(div)).toBe('');
    });

    test('should use title as alt if no alt is present', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      img.title = 'Image title';
      
      expect(extractor.imageToMarkdown(img)).toBe('![Image title](https://example.com/image.jpg)');
    });
  });

});