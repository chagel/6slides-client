# Notion Slides Testing Guide

This guide covers the testing setup, strategies, and best practices for the Notion Slides extension, including how to test subscription features.

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
8. **Subscription Feature Tests**: Implement automated tests for subscription features

## Subscription Testing

Notion to Slides implements a subscription-based model with FREE and PRO tiers. This section covers how to test these features effectively.

### Subscription Test Tools

We have developed tools for testing subscription-based features:

#### 1. Subscription Test UI in Developer Tab

The Developer tab in the extension's About page includes a Subscription Testing section where you can:

- Set different subscription levels (FREE, PRO, PRO with expiry, etc.)
- View the current subscription status
- Check if the user has pro access
- See any subscription expiry dates

To access this:
1. Open the extension
2. Navigate to the Developer tab in the sidebar
3. Scroll down to the "Subscription Testing" section

#### 2. Dedicated Testing Suite

For more comprehensive testing, a dedicated test suite is available:

1. Open the extension
2. Go to the Developer tab
3. Click the "Open Test Suite" link in the Subscription Testing section

This will open a dedicated test page with:
- Subscription controls to change subscription states
- Individual tests for theme restrictions, slide limits, and UI updates
- A summary of features by subscription level

### Key Features to Test

| Feature | FREE | PRO | TEAM |
|---------|------|-----|------|
| Slide Limit | 10 slides max | Unlimited | Unlimited |
| Premium Themes | ❌ Default only | ✅ All themes | ✅ All themes |
| Markdown Support | ❌ No | ✅ Yes | ✅ Yes |

### Testing Procedure

#### 1. Theme Restrictions

1. Set subscription to FREE
2. Open Settings and check that premium themes (Catppuccin Latte, Catppuccin Mocha) show "(PRO)" and are disabled
3. Try selecting a premium theme (should show a PRO overlay)
4. Set subscription to PRO
5. Verify premium themes are available and selectable

#### 2. Slide Limit

1. Set subscription to FREE
2. Create a test Notion page with 15+ slides (H1 headings)
3. Generate slides and verify only 10 content slides plus an upgrade slide are shown
4. Set subscription to PRO
5. Generate slides again and verify all slides are included

#### 3. UI Subscription Status

1. Set subscription to FREE
2. Verify the FREE badge is shown in Settings
3. Verify pro features are marked with PRO badges
4. Set subscription to PRO
5. Verify PRO badge is shown and subscription info is updated
6. Set subscription to PRO with expiry
7. Verify expiry date is correctly displayed

#### 4. Expired Subscription

1. Set subscription to PRO (Expired)
2. Verify the user no longer has access to PRO features
3. Check that theme restrictions and slide limits apply as for FREE users

### Programmatic Subscription Testing

For developers who need to test programmatically, the `subscriptionTester` utility is available:

```typescript
import { subscriptionTester } from '../controllers/developer/subscription_test';

// Set subscription level programmatically
await subscriptionTester.setFree();
await subscriptionTester.setPro();
await subscriptionTester.setProWithExpiry();
await subscriptionTester.setProExpired();
await subscriptionTester.setTeam();

// Get current status
const status = subscriptionTester.getCurrentStatus();
console.log(status.level);      // 'free', 'pro', or 'team'
console.log(status.hasPro);     // true or false
console.log(status.expiry);     // expiry date or 'No expiry'
```

### Implementation Details

The subscription system is implemented in `src/models/config_manager.ts` with the following key components:

1. **SubscriptionLevel enum**: Defines FREE, PRO, and TEAM levels
2. **hasPro() method**: Checks if user has pro features based on level and expiry
3. **hasRemainingSlides() method**: Enforces slide limits for free users
4. **setSubscription() method**: Sets subscription level and expiry date