# Notion Slides Testing Guide

This guide covers the testing setup, strategies, and best practices for the Notion Slides extension.

## Testing Setup

Notion Slides uses Jest as its primary testing framework, configured for ES modules and JSDOM for DOM simulation.

### Key Configuration Files

- **jest.config.js**: Contains Jest configuration for ES modules, test environment, and path mappings
- **babel.config.js**: Babel configuration for transpiling modern JavaScript in tests
- **tests/setup.js**: Global test setup with mocks for core services

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test files
npm test -- extractors/notion/headingExtractor.test.js

# Run tests with watch mode (for development)
npm test -- --watch
```

## Test Structure

Tests are organized by component type and follow a hierarchical structure:

```
tests/
  ├── extractors/             # Tests for content extraction components
  │   ├── baseExtractor.test.js
  │   └── notion/             # Notion-specific extractors
  │       ├── blockquoteExtractor.test.js
  │       ├── codeBlockExtractor.test.js
  │       ├── headingExtractor.test.js
  │       ├── imageExtractor.test.js
  │       ├── listExtractor.test.js
  │       ├── notionExtractor.test.js
  │       ├── paragraphExtractor.test.js
  │       └── tableExtractor.test.js
  └── services/               # Tests for application services
      └── __mocks__/          # Service mocks
          └── LoggingService.js
```

### Test File Structure

Each test file follows a consistent pattern:

1. **Imports**: Import Jest utilities, component under test, and dependencies
2. **Mock Setup**: Set up any necessary mocks
3. **Test Suite Setup**: Define the test suite with describe blocks
4. **Before/After Hooks**: Set up and tear down test environment
5. **Test Cases**: Individual test cases organized by functionality

Example:

```javascript
/**
 * Tests for Component X
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ComponentX } from '../path/to/component.js';
import { dependencyY } from '../path/to/dependency.js';

// Optional: Mock dependencies
jest.mock('../path/to/dependency.js');

describe('ComponentX', () => {
  // Setup and teardown
  let component;
  
  beforeEach(() => {
    // Reset state
    document.body.innerHTML = '';
    component = new ComponentX();
  });

  describe('methodA', () => {
    test('should do X when Y', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.methodA(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

## Testing Strategies

### DOM Testing

JSDOM is used to simulate browser DOM APIs in Node.js. This enables testing components that manipulate the DOM without requiring a browser.

```javascript
// Example: Testing DOM manipulation
test('should create an element with correct text', () => {
  // Setup mock DOM
  document.body.innerHTML = '<div id="container"></div>';
  
  // Run component that manipulates DOM
  myComponent.createElementWithText('Hello World');
  
  // Assert DOM changes
  const element = document.querySelector('.created-element');
  expect(element).not.toBeNull();
  expect(element.textContent).toBe('Hello World');
});
```

### Mocking Services

Core services are mocked to isolate components during testing:

```javascript
// Example mock file: src/services/__mocks__/LoggingService.js
import { jest } from '@jest/globals';

export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// In test file:
jest.mock('../services/LoggingService.js');
```

### Testing Extractors

Extractors are tested by providing mock DOM structures and verifying the extraction output:

1. Create a mock DOM structure representing a specific content type
2. Run the extractor on this structure
3. Verify the extracted content matches expected format

```javascript
test('should extract heading with correct level', () => {
  // Create mock DOM
  document.body.innerHTML = '<h1>Test Heading</h1>';
  
  // Run extractor
  const extractor = new HeadingExtractor(document);
  const headings = extractor.extractHeadingsOfLevel(1);
  
  // Verify extraction
  expect(headings.length).toBe(1);
  expect(extractor.headingToMarkdown(headings[0], 1)).toBe('# Test Heading');
});
```

## Test Coverage

The project maintains high test coverage for core components, particularly extractors:

- **Extractors**: >90% statement coverage
- **BaseExtractor**: ~85% statement coverage
- **Notion Extractors**: >94% statement coverage collectively

Run coverage reports with:

```bash
npm test -- --coverage
```

### Coverage Targets

- Statements: >80%
- Branches: >75%
- Functions: >90%
- Lines: >80%

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on state from other tests
2. **Test DOM Compatibility**: Be aware of JSDOM limitations vs. real browsers
3. **Mock External Dependencies**: Use Jest mocks for external dependencies
4. **Descriptive Test Names**: Use descriptive names that explain the expected behavior
5. **Group Related Tests**: Use describe blocks to group related tests
6. **Test Edge Cases**: Include tests for edge cases and error conditions
7. **Keep Tests Fast**: Tests should execute quickly to maintain development velocity
8. **Regular Coverage Checks**: Run coverage reports regularly to identify gaps
9. **Test Public API**: Focus on testing the public API of components

## Troubleshooting Common Issues

### JSDOM Compatibility Issues

JSDOM doesn't implement all browser APIs. Common issues and solutions:

- **innerText vs textContent**: Use textContent for compatibility
- **Element.closest()**: May not work as expected - implement fallbacks
- **Layout calculations**: JSDOM doesn't perform layout - avoid testing layout-dependent code

### ES Module Issues

Testing ES modules requires special configuration:

- Use `--experimental-vm-modules` flag
- Use proper import statements in test files
- Use bare specifiers (not relative) with import assertions for JSON

### Mock Function Issues

- Use `jest.fn()` from '@jest/globals' in ESM
- Reset mocks between tests with `jest.resetAllMocks()`
- Verify mocks were called with `expect(mockFn).toHaveBeenCalledWith(...)`

## Future Testing Improvements

1. **Integration Tests**: Add integration tests for component interactions
2. **End-to-End Tests**: Add E2E tests with Puppeteer or Playwright
3. **Visual Regression Tests**: Add visual regression tests for UI components
4. **Performance Tests**: Add performance benchmarks for critical paths
5. **Markdown Extractor Tests**: Add tests for markdown extractors
6. **Service Tests**: Add more thorough tests for application services