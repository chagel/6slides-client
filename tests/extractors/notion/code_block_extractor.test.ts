/**
 * Tests for Notion Code Block Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CodeBlockExtractor } from '../../../src/models/extractors/notion/code_block_extractor';
import { loggingService } from '../../../src/services/logging_service';

describe('CodeBlockExtractor', () => {
  // Setup and teardown
  let extractor: CodeBlockExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new CodeBlockExtractor(mockDocument);
  });

  describe('isCodeBlock', () => {
    test('should identify Notion code block by class', () => {
      const div = document.createElement('div');
      div.className = 'notion-code-block';
      expect(extractor.isCodeBlock(div)).toBe(true);
    });

    test('should identify HTML pre element', () => {
      const pre = document.createElement('pre');
      pre.textContent = 'function test() {}';
      expect(extractor.isCodeBlock(pre)).toBe(true);
    });

    test('should identify element containing code element', () => {
      const div = document.createElement('div');
      const code = document.createElement('code');
      code.textContent = 'const x = 5;';
      div.appendChild(code);
      expect(extractor.isCodeBlock(div)).toBe(true);
    });

    test('should not identify non-code elements', () => {
      const p = document.createElement('p');
      p.textContent = 'This is not code';
      expect(extractor.isCodeBlock(p)).toBe(false);
    });
  });

  describe('codeBlockToMarkdown', () => {
    test('should convert code block to HTML with language', () => {
      const pre = document.createElement('pre');
      pre.className = 'language-javascript';
      pre.textContent = 'function test() {\n  return true;\n}';
      
      const result = extractor.codeBlockToMarkdown(pre);
      expect(result).toBe('<pre><code data-trim data-noescape class="language-javascript">function test() {\n  return true;\n}</code></pre>');
    });

    test('should extract code from nested code element', () => {
      const div = document.createElement('div');
      const pre = document.createElement('pre');
      pre.textContent = 'SELECT * FROM users;';
      div.appendChild(pre);
      
      const result = extractor.codeBlockToMarkdown(div);
      expect(result).toBe('<pre><code data-trim data-noescape class="language-">SELECT * FROM users;</code></pre>');
    });

    test('should handle Notion language indicator', () => {
      const div = document.createElement('div');
      div.className = 'notion-code-block';
      
      const langIndicator = document.createElement('div');
      langIndicator.className = 'notion-code-language';
      langIndicator.textContent = 'Python';
      
      const code = document.createElement('code');
      code.textContent = 'def hello():\n    print("Hello")';
      
      div.appendChild(langIndicator);
      div.appendChild(code);
      
      const result = extractor.codeBlockToMarkdown(div);
      expect(result).toBe('<pre><code data-trim data-noescape class="language-python">def hello():\n    print("Hello")</code></pre>');
    });

    test('should return empty string for empty code blocks', () => {
      const pre = document.createElement('pre');
      pre.textContent = '';
      
      const result = extractor.codeBlockToMarkdown(pre);
      expect(result).toBe('');
    });
  });

});