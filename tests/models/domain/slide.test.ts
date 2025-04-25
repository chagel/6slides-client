/**
 * Tests for Slide model with subslides support
 */

import { jest, describe, test, expect } from '@jest/globals';
import { Slide } from '../../../src/models/domain/slide';

describe('Slide Model with Subslides', () => {
  describe('constructor', () => {
    test('should initialize subslides array', () => {
      const slide = new Slide();
      expect(slide.subslides).toBeDefined();
      expect(slide.subslides).toEqual([]);
    });

    test('should initialize from data with subslides', () => {
      const slideData = {
        title: 'Main Slide',
        content: 'Main content',
        sourceType: 'notion',
        subslides: [
          {
            title: 'Subslide 1',
            content: 'Subslide content',
            sourceType: 'notion'
          }
        ]
      };

      const slide = new Slide(slideData);
      
      expect(slide.title).toBe('Main Slide');
      expect(slide.content).toBe('Main content');
      expect(slide.subslides.length).toBe(1);
      expect(slide.subslides[0].title).toBe('Subslide 1');
    });
  });

  describe('addSubslide', () => {
    test('should add a subslide to the slide', () => {
      const mainSlide = new Slide({
        title: 'Main Slide',
        content: 'Main content',
        sourceType: 'notion'
      });

      const subslide = new Slide({
        title: 'Subslide',
        content: 'Subslide content',
        sourceType: 'notion'
      });

      mainSlide.addSubslide(subslide);
      
      expect(mainSlide.subslides.length).toBe(1);
      expect(mainSlide.subslides[0]).toBe(subslide);
    });
  });

  describe('hasSubslides', () => {
    test('should return true when slide has subslides', () => {
      const slide = new Slide();
      slide.addSubslide(new Slide({ title: 'Subslide' }));
      
      expect(slide.hasSubslides()).toBe(true);
    });

    test('should return false when slide has no subslides', () => {
      const slide = new Slide();
      expect(slide.hasSubslides()).toBe(false);
    });
  });

  describe('toMarkdown', () => {
    test('should include subslides in markdown representation', () => {
      const mainSlide = new Slide({
        title: 'Main Slide',
        content: 'Main content',
        sourceType: 'markdown'
      });

      mainSlide.addSubslide(new Slide({
        title: 'First Subslide',
        content: 'First subslide content',
        sourceType: 'markdown'
      }));

      mainSlide.addSubslide(new Slide({
        title: 'Second Subslide',
        content: 'Second subslide content',
        sourceType: 'markdown'
      }));

      const markdown = mainSlide.toMarkdown();
      
      expect(markdown).toContain('# Main Slide');
      expect(markdown).toContain('Main content');
      expect(markdown).toContain('## First Subslide');
      expect(markdown).toContain('First subslide content');
      expect(markdown).toContain('## Second Subslide');
      expect(markdown).toContain('Second subslide content');
    });

    test('should generate markdown without subslides if none exist', () => {
      const slide = new Slide({
        title: 'Regular Slide',
        content: 'Regular content',
        sourceType: 'markdown'
      });

      const markdown = slide.toMarkdown();
      
      expect(markdown).toBe('# Regular Slide\n\nRegular content');
    });
  });

  describe('toObject', () => {
    test('should include subslides in object representation', () => {
      const mainSlide = new Slide({
        title: 'Main Slide',
        content: 'Main content',
        sourceType: 'notion'
      });

      mainSlide.addSubslide(new Slide({
        title: 'Subslide',
        content: 'Subslide content',
        sourceType: 'notion'
      }));

      const obj = mainSlide.toObject();
      
      expect(obj.title).toBe('Main Slide');
      expect(obj.content).toBe('Main content');
      expect(obj.subslides).toBeDefined();
      expect(obj.subslides?.length).toBe(1);
      expect(obj.subslides?.[0].title).toBe('Subslide');
    });
  });

  describe('fromObject', () => {
    test('should create a slide with subslides from object', () => {
      const obj = {
        title: 'Main Slide',
        content: 'Main content',
        sourceType: 'notion',
        subslides: [
          {
            title: 'Subslide 1',
            content: 'Subslide 1 content',
            sourceType: 'notion'
          },
          {
            title: 'Subslide 2',
            content: 'Subslide 2 content',
            sourceType: 'notion'
          }
        ]
      };

      const slide = Slide.fromObject(obj);
      
      expect(slide.title).toBe('Main Slide');
      expect(slide.content).toBe('Main content');
      expect(slide.subslides.length).toBe(2);
      expect(slide.subslides[0].title).toBe('Subslide 1');
      expect(slide.subslides[1].title).toBe('Subslide 2');
    });
  });
});