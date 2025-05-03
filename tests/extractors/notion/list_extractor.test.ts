/**
 * Tests for Notion List Extractor
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ListExtractor } from '../../../src/models/extractors/notion/list_extractor';

describe('ListExtractor', () => {
  // Setup and teardown
  let extractor: ListExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    // Reset DOM for each test
    document.body.innerHTML = '';
    mockDocument = document;
    
    // Create a new extractor with the mock document
    extractor = new ListExtractor(mockDocument);
    
  });

  describe('isList', () => {
    test('should identify Notion bulleted list block', () => {
      const div = document.createElement('div');
      div.className = 'notion-bulleted_list-block';
      expect(extractor.isList(div)).toBe(true);
    });

    test('should identify Notion numbered list block', () => {
      const div = document.createElement('div');
      div.className = 'notion-numbered_list-block';
      expect(extractor.isList(div)).toBe(true);
    });

    test('should identify Notion to-do block', () => {
      const div = document.createElement('div');
      div.className = 'notion-to_do-block';
      expect(extractor.isList(div)).toBe(true);
    });

    test('should identify Notion toggle block', () => {
      const div = document.createElement('div');
      div.className = 'notion-toggle-block';
      expect(extractor.isList(div)).toBe(true);
    });

    test('should identify Notion list block', () => {
      const div = document.createElement('div');
      div.className = 'notion-list-block';
      expect(extractor.isList(div)).toBe(true);
    });

    test('should not identify HTML elements', () => {
      const ul = document.createElement('ul');
      expect(extractor.isList(ul)).toBe(false);
      
      const ol = document.createElement('ol');
      expect(extractor.isList(ol)).toBe(false);
    });

    test('should not identify paragraph with text patterns', () => {
      const p1 = document.createElement('p');
      p1.textContent = '1. First item';
      expect(extractor.isList(p1)).toBe(false);
      
      const p2 = document.createElement('p');
      p2.textContent = 'Item 1: First point';
      expect(extractor.isList(p2)).toBe(false);
      
      const p3 = document.createElement('p');
      p3.textContent = '- Bullet point';
      expect(extractor.isList(p3)).toBe(false);
    });

    test('should not identify regular paragraphs', () => {
      const p = document.createElement('p');
      p.textContent = 'Regular paragraph text';
      expect(extractor.isList(p)).toBe(false);
    });
  });

  describe('isOrderedListItem', () => {
    test('should identify Notion numbered list block', () => {
      const div = document.createElement('div');
      div.className = 'notion-numbered_list-block';
      expect(extractor.isOrderedListItem(div)).toBe(true);
    });

    test('should not identify HTML ol element', () => {
      const ol = document.createElement('ol');
      expect(extractor.isOrderedListItem(ol)).toBe(false);
    });

    test('should not identify paragraph with numbered list pattern', () => {
      const p = document.createElement('p');
      p.textContent = '1. First item';
      expect(extractor.isOrderedListItem(p)).toBe(false);
    });

    test('should not identify unordered list items', () => {
      const ul = document.createElement('ul');
      expect(extractor.isOrderedListItem(ul)).toBe(false);
      
      const div = document.createElement('div');
      div.className = 'notion-bulleted_list-block';
      expect(extractor.isOrderedListItem(div)).toBe(false);
      
      const p = document.createElement('p');
      p.textContent = '- Bullet point';
      expect(extractor.isOrderedListItem(p)).toBe(false);
    });
  });

  describe('processList', () => {
    test('should process unordered list elements', () => {
      const listElements = [
        createNotionListElement('notion-bulleted_list-block', 'First item'),
        createNotionListElement('notion-bulleted_list-block', 'Second item'),
        createNotionListElement('notion-bulleted_list-block', 'Third item')
      ];
      
      const markdown = extractor.processList(listElements, false);
      
      expect(markdown).toBe('- First item\n- Second item\n- Third item');
    });

    test('should process ordered list elements', () => {
      const listElements = [
        createNotionListElement('notion-numbered_list-block', 'First item'),
        createNotionListElement('notion-numbered_list-block', 'Second item'),
        createNotionListElement('notion-numbered_list-block', 'Third item')
      ];
      
      const markdown = extractor.processList(listElements, true);
      
      // Note: Our implementation now uses listToMarkdown which always uses '1.' for ordered lists
      expect(markdown).toBe('1. First item\n1. Second item\n1. Third item');
    });

    test('should process nested unordered list elements', () => {
      // First, let's create a structure where we mock the indentation level
      // without actual parent-child DOM relationships
      
      // Mock getIndentationLevel method to return specific values for our test elements
      const originalGetIndentationLevel = extractor.getIndentationLevel;
      
      jest.spyOn(extractor, 'getIndentationLevel').mockImplementation((element) => {
        // Check element's text content to determine its level
        if (element.textContent === 'Child of parent 1' || element.textContent === 'Child of parent 2') {
          return 1; // Children have indent level 1
        }
        return 0; // Parents have indent level 0
      });
      
      // Create the elements without DOM nesting
      const parent1 = createNotionListElement('notion-bulleted_list-block', 'Parent 1');
      const child1 = createNotionListElement('notion-bulleted_list-block', 'Child of parent 1');
      const parent2 = createNotionListElement('notion-bulleted_list-block', 'Parent 2');
      const child2 = createNotionListElement('notion-bulleted_list-block', 'Child of parent 2');
      
      // Create list of elements to process
      const listElements = [parent1, child1, parent2, child2];
      
      // Process the list
      const markdown = extractor.processList(listElements, false);
      
      // Restore the original method
      jest.spyOn(extractor, 'getIndentationLevel').mockRestore();
      
      // Should show proper indentation for children
      expect(markdown).toBe('- Parent 1\n  - Child of parent 1\n- Parent 2\n  - Child of parent 2');
    });
    
    test('should process mixed nested list types', () => {
      // Mock getIndentationLevel method to return specific values for our test elements
      jest.spyOn(extractor, 'getIndentationLevel').mockImplementation((element) => {
        // Check element's text content to determine its level
        if (element.textContent === 'Numbered child' || element.textContent === 'Bullet child') {
          return 1; // Children have indent level 1
        }
        return 0; // Parents have indent level 0
      });
      
      // Create the list elements
      const bulletParent = createNotionListElement('notion-bulleted_list-block', 'Bullet parent');
      const numberedChild = createNotionListElement('notion-numbered_list-block', 'Numbered child');
      const numberedParent = createNotionListElement('notion-numbered_list-block', 'Numbered parent');
      const bulletChild = createNotionListElement('notion-bulleted_list-block', 'Bullet child');
      
      // Create list of elements to process
      const listElements = [bulletParent, numberedChild, numberedParent, bulletChild];
      
      const markdown = extractor.processList(listElements, false);
      
      // Restore the original method
      jest.spyOn(extractor, 'getIndentationLevel').mockRestore();
      
      // Should correctly format each type with proper indentation
      expect(markdown).toBe('- Bullet parent\n  1. Numbered child\n1. Numbered parent\n  - Bullet child');
    });
    
    test('should process deeply nested list elements (3 levels)', () => {
      // Mock getIndentationLevel method to return specific values for our test elements
      jest.spyOn(extractor, 'getIndentationLevel').mockImplementation((element) => {
        // Check element's text content to determine its level
        if (element.textContent === 'Level 1') {
          return 0;
        } else if (element.textContent === 'Level 2') {
          return 1;
        } else if (element.textContent === 'Level 3') {
          return 2;
        }
        return 0;
      });
      
      // Create the elements
      const level1 = createNotionListElement('notion-bulleted_list-block', 'Level 1');
      const level2 = createNotionListElement('notion-bulleted_list-block', 'Level 2');
      const level3 = createNotionListElement('notion-bulleted_list-block', 'Level 3');
      
      // Create list of elements to process
      const listElements = [level1, level2, level3];
      
      const markdown = extractor.processList(listElements, false);
      
      // Restore the original method
      jest.spyOn(extractor, 'getIndentationLevel').mockRestore();
      
      // Should show proper indentation for all levels
      expect(markdown).toBe('- Level 1\n  - Level 2\n    - Level 3');
    });

    test('should handle empty list', () => {
      expect(extractor.processList([])).toBe('');
      // Use an empty array instead of null
      expect(extractor.processList([] as Element[])).toBe('');
    });
  });

  describe('listToMarkdown', () => {
    test('should convert Notion bulleted list block to markdown', () => {
      const div = document.createElement('div');
      div.className = 'notion-bulleted_list-block';
      div.textContent = 'Notion bullet item';
      
      expect(extractor.listToMarkdown(div)).toBe('- Notion bullet item');
    });

    test('should convert Notion numbered list block to markdown', () => {
      const div = document.createElement('div');
      div.className = 'notion-numbered_list-block';
      div.textContent = 'Notion numbered item';
      
      expect(extractor.listToMarkdown(div)).toBe('1. Notion numbered item');
    });

    test('should add proper indentation for nested bulleted lists', () => {
      // Create a nested structure
      const parentDiv = document.createElement('div');
      parentDiv.className = 'notion-bulleted_list-block';
      
      const childDiv = document.createElement('div');
      childDiv.className = 'notion-bulleted_list-block';
      childDiv.textContent = 'Nested bullet item';
      
      // Mock the parent-child relationship
      parentDiv.appendChild(childDiv);
      document.body.appendChild(parentDiv);

      // The child should have an indentation level of 1
      expect(extractor.listToMarkdown(childDiv)).toBe('  - Nested bullet item');
    });

    test('should add proper indentation for nested numbered lists', () => {
      // Create a nested structure
      const parentDiv = document.createElement('div');
      parentDiv.className = 'notion-numbered_list-block';
      
      const childDiv = document.createElement('div');
      childDiv.className = 'notion-numbered_list-block';
      childDiv.textContent = 'Nested numbered item';
      
      // Mock the parent-child relationship
      parentDiv.appendChild(childDiv);
      document.body.appendChild(parentDiv);
      
      // The child should have an indentation level of 1
      expect(extractor.listToMarkdown(childDiv)).toBe('  1. Nested numbered item');
    });

    test('should handle deeply nested lists', () => {
      // Create a deeply nested structure (3 levels)
      const level1 = document.createElement('div');
      level1.className = 'notion-bulleted_list-block';
      
      const level2 = document.createElement('div');
      level2.className = 'notion-bulleted_list-block';
      
      const level3 = document.createElement('div');
      level3.className = 'notion-bulleted_list-block';
      level3.textContent = 'Deeply nested item';
      
      // Build the nested structure
      level2.appendChild(level3);
      level1.appendChild(level2);
      document.body.appendChild(level1);
      
      const indentLevel = extractor.getIndentationLevel(level3);
      const output = extractor.listToMarkdown(level3);
      
      // The deepest level should have an indentation level of 2
      expect(output).toBe('    - Deeply nested item');
    });
    
    test('should handle mixed nested list types', () => {
      // Create a mixed nested structure
      const bulParent = document.createElement('div');
      bulParent.className = 'notion-bulleted_list-block';
      
      const numChild = document.createElement('div');
      numChild.className = 'notion-numbered_list-block';
      numChild.textContent = 'Numbered inside bulleted';
      
      // Build the nested structure
      bulParent.appendChild(numChild);
      document.body.appendChild(bulParent);
      
      // The numbered child inside a bulleted parent should have indentation
      expect(extractor.listToMarkdown(numChild)).toBe('  1. Numbered inside bulleted');
    });

    test('should handle fallback case for unknown elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Unknown element';
      
      // Should use the fallback formatting
      expect(extractor.listToMarkdown(div)).toBe('- Unknown element');
    });
  });

  // Tests for getIndentationLevel and other methods have been sufficiently covered
  
  describe('getIndentationLevel', () => {
    test('should return 0 for top-level list items', () => {
      const div = document.createElement('div');
      div.className = 'notion-bulleted_list-block';
      document.body.appendChild(div);
      
      expect(extractor.getIndentationLevel(div)).toBe(0);
    });
    
    test('should detect one level of nesting', () => {
      // Create parent-child hierarchy
      const parent = document.createElement('div');
      parent.className = 'notion-bulleted_list-block';
      
      const child = document.createElement('div');
      child.className = 'notion-bulleted_list-block';
      
      parent.appendChild(child);
      document.body.appendChild(parent);
      
      expect(extractor.getIndentationLevel(child)).toBe(1);
    });
    
    test('should detect multiple levels of nesting', () => {
      // Create 3 levels of nesting
      const level1 = document.createElement('div');
      level1.className = 'notion-bulleted_list-block';
      
      const level2 = document.createElement('div');
      level2.className = 'notion-bulleted_list-block';
      
      const level3 = document.createElement('div');
      level3.className = 'notion-bulleted_list-block';
      
      level2.appendChild(level3);
      level1.appendChild(level2);
      document.body.appendChild(level1);
      
      expect(extractor.getIndentationLevel(level3)).toBe(2);
    });
    
    test('should ignore non-list parent elements', () => {
      // Create structure with mixed parent types
      const div = document.createElement('div');
      
      const wrapper = document.createElement('div');
      wrapper.className = 'not-a-list-class';
      
      const list = document.createElement('div');
      list.className = 'notion-bulleted_list-block';
      
      wrapper.appendChild(list);
      div.appendChild(wrapper);
      document.body.appendChild(div);
      
      expect(extractor.getIndentationLevel(list)).toBe(0);
    });
  });
});

// Helper function to create an element with text content
function createElementWithText(tag: string, text: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

// Helper function to create Notion list elements
function createNotionListElement(className: string, text: string) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}
