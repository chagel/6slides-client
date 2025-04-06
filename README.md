[![Run Tests](https://github.com/chagel/notion_slides/actions/workflows/tests.yml/badge.svg)](https://github.com/chagel/notion_slides/actions/workflows/tests.yml)

# Notion Slides

A Chrome extension that converts Notion pages to beautiful presentations using reveal.js.

## Features

- Extract content from Notion pages using a template format
- Convert to reveal.js presentations with markdown support
- Multiple themes: Default (Dark), Catppuccin Latte (Light), and Catppuccin Mocha (Dark)
- Support for Notion blocks: headings, lists, code blocks, tables, images, quotes, and more

## How to Use

1. Navigate to a Notion page you want to convert
2. Make sure your page follows the template format:
   - H1 headings (#) define slide titles and start new slides
   - H2/H3 headings (##/###) for subtitles within slides
   - Content between H1s belongs to the previous H1
3. Click the extension icon to open the popup
4. Select your preferred theme
5. Click "Convert This Page"
6. The slides will open in a new tab

## Template Format

- **H1 elements (#)** define slide titles and start new slides
- **H2 elements (##)** are section titles within slides
- **H3 elements (###)** are subsection titles
- **Bullet points** (- or *) are preserved as lists
- **Paragraphs** become regular text
- **Code blocks** are formatted appropriately
- **Images** are included with their captions
- **Tables** are preserved in the slides
- **Quotes** and other Notion blocks are supported

## Development

For detailed architectural information, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

For a comprehensive testing guide, see [TESTING.md](docs/TESTING.md).

### Project Structure

The project uses a clean modular architecture with domain-driven design patterns:

```
src/
  ├── app.ts            # Application bootstrap and initialization
  ├── common/           # Shared utilities
  │   └── messaging.ts  # Component communication
  ├── models/           # Business logic and data models
  │   ├── domain/       # Domain models
  │   │   ├── Slide.ts             # Slide domain model
  │   │   ├── Presentation.ts      # Presentation domain model
  │   │   └── types.ts             # Domain type definitions
  │   ├── configManager.ts         # Configuration management
  │   ├── contentExtractor.ts      # Content extraction coordination
  │   ├── contentProcessor.ts      # Content normalization
  │   ├── renderer.ts              # Presentation rendering
  │   ├── sourceManager.ts         # Source detection
  │   ├── storage.ts               # Data persistence
  │   └── extractors/              # Specialized extractors
  │       ├── baseExtractor.ts     # Base extractor interface
  │       ├── markdown/            # Markdown extractors
  │       └── notion/              # Notion extractors
  ├── services/         # Application services
  │   ├── DependencyContainer.ts   # Dependency injection
  │   ├── ErrorService.ts          # Centralized error handling
  │   ├── LoggingService.ts        # Centralized logging
  │   └── serviceRegistry.ts       # Service registration
  ├── controllers/      # Controllers connecting models and views
  │   ├── contentController.ts     # Content orchestration
  │   ├── popup/                   # Extension popup controller
  │   ├── settings/                # Settings controller
  │   └── viewer/                  # Presentation viewer controller
  ├── types/            # TypeScript type definitions
  │   ├── index.ts                 # Type exports
  │   └── storage.ts               # Storage-related types
  ├── views/            # HTML views
  ├── content/          # Content script
  │   └── entry.ts      # Content script entry point
  └── background/       # Background script
      └── index.ts      # Service worker
```

### Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory
5. Navigate to a Notion page and test the extension

### Development Workflow

1. Make changes to the source files in the `src` directory
2. Run `npm run build` to build the extension (uses Rollup for bundling)
3. Reload the extension in Chrome to test the changes
4. Use `npm run watch` to automatically rebuild on file changes
5. Use `npm run lint` to check for code style issues
6. Use `npm test` to run Jest tests
7. Use `npm test -- --coverage` to view test coverage

### Build Process

The build process:
1. Uses Rollup to bundle JavaScript modules
2. Converts ES modules to IIFE for compatibility with Chrome extension context
3. Handles proper module formats for different parts of the extension:
   - Background service worker: ESM format
   - Content script: Single IIFE bundle with all dependencies included
   - Popup/UI scripts: IIFE format for maximum compatibility
4. Copies static assets and updates HTML files to use bundled scripts

### Adding New Features

- For new content types, add a new extractor in `src/models/extractors/`
- For UI enhancements, modify the relevant controller in `src/controllers/` and view in `src/views/`
- For new presentation features, extend the renderer in `src/models/renderer.js`
- Add new entries to rollup.config.js if necessary

## Version History

### Version 1.4.0
- Migrated codebase from JavaScript to TypeScript
- Added TypeScript type definitions for all files
- Configured TypeScript build process and ESLint integration
- Updated Jest tests to use TypeScript
- Improved type safety throughout the application
- Fixed service worker context detection for storage operations
- Enhanced dependency injection with type-safe services

### Version 1.3.0
- Added comprehensive Jest test suite for extractors
- Implemented unit tests for all Notion extractors with >90% code coverage
- Fixed JSDOM compatibility issues in extractors for better testing
- Added test setup and configuration for Jest with ES modules
- Improved error handling in extractors for edge cases

### Version 1.2.0
- Implemented centralized logging with LoggingService
- Removed utils.js in favor of a proper service architecture
- Improved error handling with integration between LoggingService and ErrorService
- Enhanced storage management with better IndexedDB/localStorage integration
- Improved dependency management in the DI container
- Updated architectural documentation

### Version 1.1.1
- Implemented domain models for Slide and Presentation
- Added content processing and normalization layer
- Created centralized error handling with ErrorService
- Implemented dependency injection with DependencyContainer
- Added configuration management service
- Improved architectural patterns following domain-driven design

### Version 1.1.0
- Refactored codebase to use modular MVC architecture
- Implemented Rollup bundling for better code organization and compatibility
- Improved error handling and reporting
- Enhanced performance with IndexedDB for large presentations
- Added ES modules support for better code organization
- Set up TypeScript configuration for future development

### Version 1.0.0
- Initial release with basic Notion page to slides conversion
- Support for Notion blocks: headings, lists, code blocks, tables, images, quotes
- Multiple themes including Catppuccin themes
- Basic presentation settings for transitions and display options

## Credits and Licenses

This extension includes open source components:

- [reveal.js](https://revealjs.com/) - Framework for creating presentations (MIT License)
- [Catppuccin](https://github.com/catppuccin/catppuccin) - Pastel theme color palette (MIT License)

Full license details can be found in LICENSE.md.

