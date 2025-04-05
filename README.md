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

### Project Structure

The project now uses a modular MVC architecture with Rollup bundling:

```
src/
  ├── common/           # Shared utilities and services
  │   ├── utils.js      # Utility functions
  │   └── messaging.js  # Communication between components
  ├── models/           # Data and business logic 
  │   ├── storage.js    # Data persistence (IndexedDB/localStorage)
  │   ├── renderer.js   # Presentation rendering
  │   ├── contentExtractor.js # Content extraction orchestration
  │   └── extractors/   # Specialized content extractors
  │       ├── baseExtractor.js
  │       ├── headingExtractor.js
  │       ├── listExtractor.js
  │       └── codeBlockExtractor.js
  ├── controllers/      # Controllers that connect models and views
  │   ├── popup/        # Extension popup controller
  │   ├── settings/     # Settings page controller
  │   └── viewer/       # Presentation viewer controller
  ├── views/            # HTML views
  │   ├── popup.html    # Extension popup view
  │   ├── settings.html # Settings page view
  │   └── viewer.html   # Presentation viewer view
  ├── content/          # Content script
  │   └── entry.js      # Consolidated content script
  └── background/       # Background script
      └── index.js      # Service worker
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

