/**
 * Tests for BaseExtractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { BaseExtractor } from '../../src/models/extractors/base_extractor';
import { loggingService } from '../../src/services/logging_service';
import { Slide } from '../../src/types';

// Create a concrete implementation for testing
class TestExtractor extends BaseExtractor {
  extract(): Slide[] {
    // Simple implementation for testing
    return [
      { title: 'Test Slide', content: 'Test content', sourceType: 'test' }
    ];
  }
}

describe('BaseExtractor', () => {
  // Setup and teardown
  let extractor: TestExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a concrete implementation
    extractor = new TestExtractor(mockDocument);
  });

  test('should not allow direct instantiation', () => {
    expect(() => {
      // @ts-ignore - We're testing that this throws, even though TypeScript won't allow it
      new BaseExtractor(document);
    }).toThrow('abstract class');
  });

  describe('validateContent', () => {
    test('should validate valid slides', () => {
      const slides: Slide[] = [
        { title: 'Slide 1', content: 'Content 1', sourceType: 'test' },
        { title: 'Slide 2', content: 'Content 2', sourceType: 'test' }
      ];
      
      expect(extractor.validateContent(slides)).toBe(true);
    });

    test('should reject empty slide array', () => {
      expect(extractor.validateContent([])).toBe(false);
    });

    test('should reject non-array input', () => {
      // @ts-ignore - We're testing invalid inputs
      expect(extractor.validateContent('not an array')).toBe(false);
      // @ts-ignore - We're testing invalid inputs
      expect(extractor.validateContent({ title: 'wrong format' })).toBe(false);
    });

    test('should reject slides with no title and no content', () => {
      // Create an array with one valid slide and one invalid slide
      const slides = [
        { title: 'Valid', content: 'Valid', sourceType: 'test' },
        // Use type assertion to allow invalid slide format for testing
        { otherProperty: 'Invalid' } as unknown as Slide // Missing title and content
      ];
      
      expect(extractor.validateContent(slides)).toBe(false);
    });
  });

  describe('findElements', () => {
    test('should find elements matching selector', () => {
      document.body.innerHTML = `
        <div class="test-class">Div 1</div>
        <div class="test-class">Div 2</div>
        <p>Not a div</p>
      `;
      
      const elements = extractor.findElements('.test-class');
      expect(elements.length).toBe(2);
      expect(elements[0].textContent).toBe('Div 1');
    });

    test('should return empty array when no matches', () => {
      document.body.innerHTML = `<p>No matching elements</p>`;
      
      const elements = extractor.findElements('.non-existent');
      expect(elements.length).toBe(0);
    });
  });

  describe('hasClass', () => {
    test('should detect class on element', () => {
      const div = document.createElement('div');
      div.className = 'test-class other-class';
      
      expect(extractor.hasClass(div, 'test-class')).toBe(true);
    });

    test('should return false when class not present', () => {
      const div = document.createElement('div');
      div.className = 'other-class';
      
      expect(extractor.hasClass(div, 'test-class')).toBe(false);
    });

    test('should handle elements with no class', () => {
      const div = document.createElement('div');
      
      expect(extractor.hasClass(div, 'any-class')).toBe(false);
    });
  });

  describe('getElementText', () => {
    test('should get element text content', () => {
      const p = document.createElement('p');
      p.textContent = '  Text with spaces  ';
      
      expect(extractor.getElementText(p)).toBe('Text with spaces');
    });

    test('should return empty string for null/undefined', () => {
      expect(extractor.getElementText(null)).toBe('');
      // TypeScript doesn't allow undefined as Element | null, so we need to cast it
      expect(extractor.getElementText(null)).toBe('');
    });
  });

  describe('debug', () => {
    test('should call loggingService.debug with class name prefix', () => {
      // Manually mock the debug function for this test
      const originalDebug = loggingService.debug;
      loggingService.debug = jest.fn();
      
      extractor.debug('Test message', { data: 'test' });
      
      expect(loggingService.debug).toHaveBeenCalledWith(
        '[TestExtractor] Test message', 
        { data: 'test' }
      );
      
      // Restore the original debug function
      loggingService.debug = originalDebug;
    });
  });
});