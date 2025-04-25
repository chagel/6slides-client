[![Run Tests](https://github.com/chagel/notion_slides/actions/workflows/tests.yml/badge.svg)](https://github.com/chagel/notion_slides/actions/workflows/tests.yml)

# Six Slides

A Chrome extension that converts Notion pages to beautiful presentations using reveal.js.

## Features

- Extract content from Notion pages using a template format
- Convert to reveal.js presentations with markdown support
- Multiple themes: Default (Dark), Catppuccin Latte (Light), and Catppuccin Mocha (Dark)
- Support for Notion blocks: headings, lists, code blocks, tables, images, quotes, and more
- Vertical subslides for structured content organization
- Offline usage with no data sent to external servers
- Minimalist design focused on content readability

## How to Use

1. Navigate to a Notion page you want to convert
2. Make sure your page follows the template format:
   - H1 headings (#) define slide titles and start new slides
   - H2 headings (##) create vertical subslides within the main slide
   - H3 headings (###) for subtitles within slides
   - Content between H1s belongs to the previous H1
3. Click the extension icon to open the popup
4. Select your preferred theme
5. Click "Convert This Page"
6. The slides will open in a new tab

### Presentation Navigation

- Use **arrow keys** or **spacebar** to navigate between slides
  - **Right arrow** or **down arrow**: advance to the next slide
  - **Left arrow** or **up arrow**: go back to the previous slide
- For slides with vertical subslides:
  - **Down arrow**: go to the subslide (vertical navigation)
  - **Right arrow**: skip subslides and go to the next main slide
  - **Up arrow**: go back up to the parent slide
- Press **ESC** to see an overview of all slides
- Press **F** to enter fullscreen mode
- Press **S** to enter speaker notes mode

## Template Format

- **H1 elements (#)** define slide titles and start new slides
- **H2 elements (##)** create vertical subslides (navigate with down arrow)
- **H3 elements (###)** are subsection titles within slides
- **Bullet points** (- or *) are preserved as lists
- **Paragraphs** become regular text
- **Code blocks** are formatted appropriately with syntax highlighting
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
  ├── app.ts                 # Application bootstrap and initialization
  ├── assets/                # Static assets
  │   ├── data/              # Data files (changelog, etc.)
  │   ├── icons/             # Icon assets
  │   └── styles/            # CSS stylesheets
  ├── models/                # Business logic and data models
  │   ├── domain/            # Domain models
  │   │   ├── slide.ts       # Slide domain model
  │   │   ├── presentation.ts # Presentation domain model
  │   │   ├── config.ts      # Configuration types and defaults
  │   │   └── types.ts       # Domain type definitions
  │   ├── config_manager.ts  # Configuration management
  │   ├── content_extractor.ts # Content extraction coordination
  │   ├── content_processor.ts # Content normalization
  │   ├── renderer.ts        # Presentation rendering
  │   ├── source_manager.ts  # Source detection
  │   ├── storage.ts         # Data persistence
  │   └── extractors/        # Specialized extractors
  │       ├── base_extractor.ts # Base extractor interface
  │       ├── markdown/      # Markdown extractors
  │       └── notion/        # Notion extractors
  ├── services/              # Application services
  │   ├── dependency_container.ts # Dependency injection
  │   ├── debug_service.ts   # Debug utilities and visuals
  │   ├── auth_service.ts    # Authentication management
  │   ├── logging_service.ts # Centralized logging
  │   ├── messaging_service.ts # Component communication
  │   └── service_registry.ts # Service registration
  ├── controllers/           # Controllers connecting models and views
  │   ├── content_controller.ts # Content orchestration
  │   ├── popup/             # Extension popup controller
  │   ├── about/             # About page controllers
  │   └── viewer/            # Presentation viewer controller
  ├── types/                 # TypeScript type definitions
  │   ├── index.ts           # Type exports
  │   └── storage.ts         # Storage-related types
  ├── views/                 # HTML views
  │   ├── components/        # HTML components and templates
  │   ├── popup.html         # Popup UI
  │   ├── about.html         # About and settings page
  │   └── viewer.html        # Presentation viewer page
  └── services/              # Service workers
      └── worker.ts          # Extension service worker
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
1. Uses Rollup to bundle TypeScript modules
2. Converts ES modules to IIFE for compatibility with Chrome extension context
3. Handles proper module formats for different parts of the extension:
   - Background service worker: ESM format
   - Content script: Single IIFE bundle with all dependencies included
   - Popup/UI scripts: IIFE format for maximum compatibility
4. Copies static assets including:
   - HTML files from views directory
   - CSS files from assets/styles directory
   - Icon files from assets/icons directory
   - Data files from assets/data directory
5. Updates version number and other placeholders in output files
6. Ensures all resources are properly referenced in manifest.json

### Adding New Features

- For new content types, add a new extractor in `src/models/extractors/`
- For UI enhancements, modify the relevant controller in `src/controllers/` and view in `src/views/`
- For stylistic changes, update the CSS files in `src/assets/styles/`
- For presentation features, extend the renderer in `src/models/renderer.ts`
- Add new entries to rollup.config.js if necessary

### Coding Standards

- All files follow the `snake_case` naming convention for consistency
- TypeScript is used throughout the codebase for type safety
- CSS is maintained in separate files from HTML for better organization
- External data sources (like changelog.txt) are used for easily-updatable content

## Credits and Licenses

This extension includes open source components:

- [reveal.js](https://revealjs.com/) - Framework for creating presentations (MIT License)

Full license details can be found in LICENSE.md.

