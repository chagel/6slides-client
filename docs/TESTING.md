# Notion Slides Testing Guide

This guide covers the testing setup, strategies, and best practices for the Notion Slides extension.

## Testing Setup

Notion Slides uses Jest as its primary testing framework, configured for ES modules and JSDOM for DOM simulation.

### Key Configuration Files

- **jest.config.ts**: Contains Jest configuration for ES modules, TypeScript support, and path mappings
- **babel.config.js**: Babel configuration for transpiling modern JavaScript in tests
- **tests/setup.ts**: Global test setup with mocks for core services and Chrome API

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test files
npm test -- extractors/notion/headingExtractor.test.js

# Run tests with watch mode (for development)
npm run test:watch
```

## Test Structure

Tests are organized by component type and follow a hierarchical structure:

```
tests/
  ├── extractors/             # Tests for content extraction components
  │   ├── baseExtractor.test.js / .ts
  │   └── notion/             # Notion-specific extractors
  │       ├── blockquoteExtractor.test.js / .ts
  │       ├── codeBlockExtractor.test.js / .ts
  │       ├── headingExtractor.test.js / .ts
  │       ├── imageExtractor.test.js / .ts
  │       ├── listExtractor.test.js / .ts
  │       ├── notionExtractor.test.js / .ts
  │       ├── paragraphExtractor.test.js / .ts
  │       └── tableExtractor.test.js / .ts
  ├── mocks/                  # Mock implementations
  │   └── services.ts         # Mock services for testing
  └── setup.ts                # Global test setup
```

### Test File Structure

Each test file follows a consistent pattern:

1. **Imports**: Import Jest utilities, component under test, and dependencies
2. **Mock Setup**: Set up any necessary mocks
3. **Test Suite Setup**: Define the test suite with describe blocks
4. **Before/After Hooks**: Set up and tear down test environment
5. **Test Cases**: Individual test cases organized by functionality

Example:

```typescript
/**
 * Tests for Component X
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ComponentX } from '../path/to/component';
import { dependencyY } from '../path/to/dependency';
import { SomeType } from '../path/to/types';

// Optional: Mock dependencies
jest.mock('../path/to/dependency');

describe('ComponentX', () => {
  // Setup and teardown
  let component: ComponentX;
  
  beforeEach(() => {
    // Reset state
    document.body.innerHTML = '';
    component = new ComponentX();
  });

  describe('methodA', () => {
    test('should do X when Y', () => {
      // Arrange
      const input: string = 'test';
      
      // Act
      const result: SomeType = component.methodA(input);
      
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

```typescript
// Example mock file: src/services/__mocks__/LoggingService.ts
import { jest } from '@jest/globals';

// Define enum to match the real service
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Export mocked service with TypeScript type definitions
export const loggingService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setDebugLogging: jest.fn(),
  setLogLevel: jest.fn(),
  isDebugLoggingEnabled: jest.fn().mockReturnValue(false),
  getStoredLogs: jest.fn().mockReturnValue([]),
  getFilteredLogs: jest.fn().mockReturnValue([])
};

// In test file:
jest.mock('../services/LoggingService');
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

## TypeScript Testing

The project has been migrated to TypeScript, and the test suite has been updated to support TypeScript tests.

### TypeScript Test Configuration

- Tests are written in TypeScript with proper type definitions
- Jest is configured with ts-jest to handle TypeScript files
- Test files have both .js and .ts versions during the transition period
- Currently Jest is configured to run .js test files while type issues in .ts files are being fixed

### Writing TypeScript Tests

When writing tests in TypeScript:

1. **Add Type Annotations**: Add proper type annotations for all variables and function parameters
2. **Import Types**: Import necessary type definitions 
3. **Mock Types**: Ensure mocks have proper typings
4. **Type Assertions**: Use type assertions when necessary with `as` syntax
5. **Handle Non-Null Assertions**: Use optional chaining or proper null checks
6. **TS-Ignore Comments**: Use `@ts-ignore` comments only when intentionally testing invalid inputs

### Example with Type Annotations

```typescript
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { HeadingExtractor } from '../../../src/models/extractors/notion/headingExtractor';
import { Slide } from '../../../src/types';

describe('HeadingExtractor', () => {
  let extractor: HeadingExtractor;
  let mockDocument: Document;
  
  beforeEach(() => {
    document.body.innerHTML = '';
    mockDocument = document;
    extractor = new HeadingExtractor(mockDocument);
  });
  
  test('should convert heading to markdown', () => {
    const h1 = document.createElement('h1');
    h1.textContent = 'Test Heading';
    
    const markdown: string = extractor.headingToMarkdown(h1, 1);
    expect(markdown).toBe('# Test Heading');
  });
});
```

## Future Testing Improvements

1. **Complete TypeScript Test Migration**: Fix remaining type issues in TypeScript test files
2. **Integration Tests**: Add integration tests for component interactions
3. **End-to-End Tests**: Add E2E tests with Puppeteer or Playwright
4. **Visual Regression Tests**: Add visual regression tests for UI components
5. **Performance Tests**: Add performance benchmarks for critical paths
6. **Markdown Extractor Tests**: Add tests for markdown extractors
7. **Service Tests**: Add more thorough tests for application services