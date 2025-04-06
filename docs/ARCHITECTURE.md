# Notion Slides Architecture

This document outlines the architecture of the Notion Slides Chrome extension, detailing how the system is structured to support multiple content sources and be extensible for future enhancements. The architecture follows Domain-Driven Design principles with clear domain models, dependency injection, and a layered approach that separates concerns while maintaining flexibility.

## Business Requirements

1. **Multi-source Support**: Extract content from various sources:
   - Notion pages
   - Static Markdown files
   - Future sources (GitHub, GitLab, etc.)

2. **Consistent Presentation**: Present extracted content as slides with consistent formatting

3. **Extensibility**: Easy addition of new content sources without rewriting core logic

4. **User Experience**: Simple, intuitive interface regardless of content source

5. **Offline Support**: Function without internet connection when possible

## Architectural Overview

The extension follows a Domain-Driven Design approach with clear separation of concerns, supported by dependency injection and the strategy pattern for extensibility.

```
┌─────────────────────────────────┐
│        User Interface           │
│ (popup.html, settings.html)     │
└──────────────┬──────────────────┘
               │
               v
┌──────────────┴──────────────────┐          ┌─────────────────────────────┐
│          Controllers            │          │        Domain Models         │
│     (coordinate user actions)   │◄─────────┤ (Slide, Presentation)        │
└──────────────┬──────────────────┘          └─────────────────────────────┘
               │                                         ▲
               v                                         │
┌──────────────┴──────────────────┐     Strategy   ┌─────┴─────────────────────┐
│      Content Source Manager     │◄────Pattern────┤        Extractors          │
│    (determines content source)  │◄─────┐         │ (source-specific parsing)  │
└──────────────┬──────────────────┘      │         └─────────────────────────┬─┘
               │                          │                                   │
               v                          │                                   │
┌──────────────┴──────────────────┐      │         ┌─────────────────────────┴─┐
│       Content Processor         │      │         │     Error Service          │
│     (normalizes all content)    │      │         │  (centralized handling)    │
└──────────────┬──────────────────┘      │         └───────────────────────────┘
               │                          │                     ▲
               v                          │                     │
┌──────────────┴──────────────────┐      │         ┌───────────┴───────────────┐
│         Slide Renderer          │      │         │     Config Manager         │
│    (creates presentation)       │      │         │ (centralized configuration)│
└──────────────┬──────────────────┘      │         └───────────────────────────┘
               │                          │                     ▲
               v                          │                     │
┌──────────────┴──────────────────┐      │         ┌───────────┴───────────────┐
│        Storage Service          │──────┘         │  Dependency Container      │
│  (saves slides & preferences)   │◄───────────────┤  (service locator/DI)      │
└───────────────────────────────┬─┘                └───────────────────────────┘
                                │     
                                v
┌─────────────────────────────────┐      ┌───────────────────────────┐
│     Persistence Layer            │      │     Logging Service        │
│  (IndexedDB, localStorage)       │      │  (centralized logging)     │
└─────────────────────────────────┘      └───────────────────────────┘
```

## Key Components

### 1. Content Source Manager

The Content Source Manager serves as a factory that determines which extractor to use based on the current page. This is the key component enabling multi-source support.

```javascript
// src/models/sourceManager.js
class SourceManager {
  detectSource(document, url) {
    if (url.includes('notion.so') || url.includes('notion.site')) {
      return 'notion';
    } else if (url.endsWith('.md') || url.endsWith('.markdown')) {
      return 'markdown';
    }
    // Future sources can be added here
    return null;
  }
  
  getExtractor(sourceType, document) {
    switch (sourceType) {
      case 'notion':
        return new NotionExtractor(document);
      case 'markdown':
        return new MarkdownExtractor(document);
      // Additional sources can be added here
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }
}
```

### 2. Content Extractors

Each supported content source has its own extractor that knows how to parse content from that source. All extractors conform to a common interface.

```javascript
// src/models/extractors/baseExtractor.js
class BaseExtractor {
  constructor(document) {
    this.document = document;
  }
  
  extract() {
    throw new Error('Extract method must be implemented by subclass');
  }
}

// src/models/extractors/notionExtractor.js
class NotionExtractor extends BaseExtractor {
  extract() {
    // Notion-specific extraction logic
    // Extract H1s, content between them, etc.
  }
}

// src/models/extractors/markdownExtractor.js
class MarkdownExtractor extends BaseExtractor {
  extract() {
    // Markdown-specific extraction logic
    // Parse markdown content and structure it into slides
  }
}
```

### 3. Content Processor

The Content Processor normalizes content from different sources into a standard internal format. This ensures consistent processing regardless of the source.

```javascript
// src/models/contentProcessor.js
class ContentProcessor {
  constructor() {
    // Initialize processor
  }
  
  process(rawContent) {
    // Process and normalize content into slides
    // Example: Convert all heading formats to a standard one
    return normalizedSlides;
  }
}
```

### 4. Storage Service

The Storage Service handles persistence, using a dual-storage strategy with localStorage for small data and IndexedDB for larger presentations.

```javascript
// src/models/storage.js
class Storage {
  async saveSlides(slides) {
    // Save slides using appropriate storage
    // Use localStorage for small data
    // Use IndexedDB for larger presentations
  }
  
  async getSlides() {
    // Retrieve slides
  }
  
  // Other storage methods
}
```

### 5. Controllers

Controllers handle user interactions and coordinate the flow between UI and business logic.

```javascript
// src/controllers/contentController.js
class ContentController {
  /**
   * Constructor with dependency injection
   */
  constructor(sourceManager, contentProcessor, storage, errorService) {
    this.sourceManager = sourceManager;
    this.contentProcessor = contentProcessor;
    this.storage = storage;
    this.errorService = errorService;
  }
  
  async extractContent(document, url) {
    try {
      // Detect source type
      const sourceType = this.sourceManager.detectSource(document, url);
      if (!sourceType) {
        return { error: 'Unsupported content source' };
      }
      
      // Get appropriate extractor
      const extractor = this.sourceManager.getExtractor(sourceType, document);
      
      // Extract raw content
      const rawSlides = extractor.extract();
      
      // Process and normalize content
      const processedSlides = this.contentProcessor.process(rawSlides);
      
      // Save and return
      await this.storage.saveSlides(processedSlides);
      return { slides: processedSlides, sourceType };
    } catch (error) {
      // Centralized error handling
      return this.errorService.handleError(error, {
        type: 'extraction',
        context: 'content_extraction'
      });
    }
  }
}
```

### 6. Domain Models

Domain models represent the core business entities and encapsulate both data and behavior.

```javascript
// src/models/domain/Slide.js
export class Slide {
  constructor(data = {}) {
    this.title = data.title || '';
    this.content = data.content || '';
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {};
  }
  
  // Convert to markdown for presentation
  toMarkdown() {
    return `# ${this.title}\n\n${this.content}`;
  }
  
  // Validation logic
  isValid() {
    return !!this.title.trim();
  }
  
  // Serialization for storage
  toObject() {
    return {
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
}
```

### 7. Logging Service

The Logging Service provides centralized logging functionality with support for different log levels and storage of log entries.

```javascript
// src/services/LoggingService.js
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

class LoggingService {
  constructor() {
    this._enabled = true;
    this._debugEnabled = false;
    this._logLevel = LogLevel.INFO;
    this._prefix = '[Notion Slides]';
    this._storeDebugLogs = false;
  }
  
  // Initialize with configuration
  initialize(config = {}) {
    if (typeof config.debugEnabled === 'boolean') this._debugEnabled = config.debugEnabled;
    if (config.logLevel) this._logLevel = config.logLevel;
    // Other initialization...
  }
  
  // Log debug messages
  debug(message, data) {
    if (!this._enabled || !this._debugEnabled) return;
    
    this._log(LogLevel.DEBUG, message, data);
  }
  
  // Log error messages
  error(message, error) {
    if (!this._enabled) return;
    
    const fullMessage = `${this._prefix} ${message}`;
    console.error(fullMessage, error || '');
    
    // Store error logs
    this._storeLog({
      level: LogLevel.ERROR,
      message: message,
      data: error ? (error instanceof Error ? error.message : error) : undefined,
      stack: error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
  
  // Additional methods for info, warn, etc.
}
```

### 8. Dependency Injection Container

The DI container manages service instances and their dependencies, promoting loose coupling.

```javascript
// src/services/DependencyContainer.js
class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }
  
  // Register a service instance
  register(name, instance) {
    this.services.set(name, instance);
  }
  
  // Register a factory function
  registerFactory(name, factory) {
    this.factories.set(name, factory);
  }
  
  // Get service by name
  get(name) {
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const instance = factory(this);
      this.services.set(name, instance);
      return instance;
    }
    
    throw new Error(`Service "${name}" not found`);
  }
}
```

## File Structure

```
src/
  ├── app.js                  # Application bootstrap and initialization
  ├── background/             # Background service worker
  │   └── index.js            # Main entry point for the background script
  ├── common/                 # Shared utilities
  │   ├── messaging.js        # Communication between components
  │   └── utils.js            # Utility functions
  ├── content/                # Content script
  │   └── entry.js            # Main entry point for content script
  ├── controllers/            # Controllers connecting models and views
  │   ├── contentController.js # Content extraction orchestration
  │   ├── navigation.js       # Navigation handling
  │   ├── popup/              # Popup UI controller
  │   │   └── index.js        # Popup controller
  │   ├── settings/           # Settings UI controller
  │   │   └── index.js        # Settings controller
  │   └── viewer/             # Viewer UI controller
  │       └── index.js        # Viewer controller
  ├── models/                 # Business logic and data models
  │   ├── configManager.js    # Configuration management
  │   ├── contentExtractor.js # Main content extraction logic
  │   ├── contentProcessor.js # Content normalization and processing
  │   ├── domain/             # Domain models
  │   │   ├── Presentation.js # Presentation domain model
  │   │   └── Slide.js        # Slide domain model
  │   ├── extractors/         # Content extractors
  │   │   ├── baseExtractor.js       # Base extractor class
  │   │   ├── index.js               # Extractor exports
  │   │   ├── markdown/              # Markdown extractors
  │   │   │   ├── index.js           # Markdown extractor exports
  │   │   │   └── markdownExtractor.js # Markdown extraction
  │   │   └── notion/                # Notion extractors
  │   │       ├── blockquoteExtractor.js # Blockquote extraction
  │   │       ├── codeBlockExtractor.js  # Code block extraction
  │   │       ├── headingExtractor.js    # Heading extraction
  │   │       ├── imageExtractor.js      # Image extraction
  │   │       ├── index.js               # Notion extractor exports
  │   │       ├── listExtractor.js       # List extraction
  │   │       ├── notionExtractor.js     # Notion extraction coordinator
  │   │       ├── paragraphExtractor.js  # Paragraph extraction
  │   │       └── tableExtractor.js      # Table extraction
  │   ├── renderer.js         # Presentation rendering
  │   ├── sourceManager.js    # Source type detection and management
  │   └── storage.js          # Data persistence (IndexedDB/localStorage)
  ├── services/               # Application services
  │   ├── DependencyContainer.js # Dependency injection container
  │   ├── ErrorService.js     # Centralized error handling
  │   ├── LoggingService.js   # Centralized logging service
  │   └── serviceRegistry.js  # Service registration
  ├── views/                  # HTML views
  │   ├── about.html          # About page
  │   ├── popup.html          # Popup UI
  │   ├── settings.html       # Settings page
  │   ├── sidebar-template.html # Sidebar template
  │   └── viewer.html         # Presentation viewer
  └── manifest.json           # Extension manifest
```

## Extension Points

The architecture supports extension in the following ways:

1. **New Content Sources**: Add a new extractor and update the Source Manager
2. **New Content Types**: Extend the Content Processor to handle new content formats
3. **Enhanced Rendering**: Modify the Slide Renderer for different presentation styles
4. **Additional Features**: Add new controllers for new extension features

## Future Enhancements

1. **GitHub/GitLab Integration**: Direct extraction from markdown on these platforms
2. **Google Docs Support**: Extract content from Google Docs
3. **Export Functionality**: Export presentations to different formats
4. **Collaboration Features**: Share and collaborate on presentations
5. **Theming Engine**: More customization options for presentations

## Sequence Flow

The following sequence diagram illustrates the typical flow when a user creates a presentation from a Notion page:

```
┌─────────┐          ┌───────────┐          ┌────────────────┐          ┌──────────────┐          ┌────────────────┐          ┌──────────┐
│  User   │          │  Popup    │          │ContentController│          │SourceManager │          │ Content        │          │ Storage  │
│         │          │           │          │                │          │              │          │ Processor      │          │          │
└────┬────┘          └─────┬─────┘          └───────┬────────┘          └──────┬───────┘          └───────┬────────┘          └────┬─────┘
     │                      │                       │                          │                          │                          │
     │  Click extension     │                       │                          │                          │                          │
     │ ─────────────────────>                       │                          │                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │    Extract content    │                          │                          │                          │
     │                      │ ─────────────────────>│                          │                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │   Detect source type     │                          │                          │
     │                      │                       │ ─────────────────────────>                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │   Return "notion"        │                          │                          │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │    Get extractor         │                          │                          │
     │                      │                       │ ─────────────────────────>                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │  Return NotionExtractor  │                          │                          │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │      Extract content     │                          │                          │
     │                      │                       │ ─────────────────────────────────────────────────────────────────────────────>│
     │                      │                       │                          │                          │                          │
     │                      │                       │     Raw slides data      │                          │                          │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     │                      │                       │                          │                          │                          │
     │                      │                       │      Process content     │                          │                          │
     │                      │                       │ ─────────────────────────────────────────────────────>                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │   Normalized slides      │                          │                          │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │
     │                      │                       │                          │                          │                          │
     │                      │                       │       Save slides        │                          │                          │
     │                      │                       │ ─────────────────────────────────────────────────────────────────────────────>│
     │                      │                       │                          │                          │                          │
     │                      │                       │       Slides saved       │                          │                          │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     │                      │                       │                          │                          │                          │
     │                      │     Open viewer       │                          │                          │                          │
     │                      │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │                          │                          │
     │                      │                       │                          │                          │                          │
     │      Show slides     │                       │                          │                          │                          │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                       │                          │                          │                          │
     │                      │                       │                          │                          │                          │
┌────┴────┐          ┌─────┴─────┐          ┌───────┴────────┐          ┌──────┴───────┐          ┌───────┴────────┐          ┌────┴─────┐
│  User   │          │  Popup    │          │ContentController│          │SourceManager │          │ Content        │          │ Storage  │
│         │          │           │          │                │          │              │          │ Processor      │          │          │
└─────────┘          └───────────┘          └────────────────┘          └──────────────┘          └────────────────┘          └──────────┘
```

## Viewing a Presentation Sequence

Once the slides are saved, the viewing process follows this flow:

```
┌─────────┐          ┌────────────┐          ┌──────────────┐          ┌────────────┐          ┌────────────┐
│  User   │          │   Viewer   │          │ Presentation  │          │ Storage    │          │ RevealJS   │
│         │          │ Controller │          │ Renderer      │          │            │          │            │
└────┬────┘          └─────┬──────┘          └──────┬───────┘          └─────┬──────┘          └─────┬──────┘
     │                      │                       │                        │                        │
     │     Open viewer      │                       │                        │                        │
     │ ─────────────────────>                       │                        │                        │
     │                      │                       │                        │                        │
     │                      │   Initialize renderer │                        │                        │
     │                      │ ─────────────────────>│                        │                        │
     │                      │                       │                        │                        │
     │                      │                       │    Load slides         │                        │
     │                      │                       │ ───────────────────────>                        │
     │                      │                       │                        │                        │
     │                      │                       │  Return slides data    │                        │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                        │
     │                      │                       │                        │                        │
     │                      │                       │     Create slides      │                        │
     │                      │                       │ ─────────────────────────────────────────────────>
     │                      │                       │                        │                        │
     │                      │                       │    Initialize slides   │                        │
     │                      │                       │ ─────────────────────────────────────────────────>
     │                      │                       │                        │                        │
     │                      │                       │  Presentation ready    │                        │
     │                      │                       │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     │                      │                       │                        │                        │
     │                      │   Rendering complete  │                        │                        │
     │                      │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                        │                        │
     │                      │                       │                        │                        │
     │     Show slides      │                       │                        │                        │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                       │                        │                        │
     │                      │                       │                        │                        │
     │  Interact with       │                       │                        │                        │
     │  presentation        │                       │                        │                        │
     │ ─────────────────────────────────────────────────────────────────────────────────────────────>│
     │                      │                       │                        │                        │
     │  Update display      │                       │                        │                        │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     │                      │                       │                        │                        │
┌────┴────┐          ┌─────┴──────┐          ┌──────┴───────┐          ┌─────┴──────┐          ┌─────┴──────┐
│  User   │          │   Viewer   │          │ Presentation  │          │ Storage    │          │ RevealJS   │
│         │          │ Controller │          │ Renderer      │          │            │          │            │
└─────────┘          └────────────┘          └──────────────┘          └────────────┘          └────────────┘
```

## Dependency Injection Flow

The following diagram illustrates how the dependency injection system works in the application:

```
┌──────────┐          ┌─────────────────┐          ┌───────────────┐          ┌────────────────┐          ┌───────────────┐
│   App    │          │ Dependency      │          │ Service       │          │ Content        │          │ Controller    │
│ Bootstrap│          │ Container       │          │ Registry      │          │ Script         │          │ Components    │
└────┬─────┘          └───────┬─────────┘          └───────┬───────┘          └────────┬───────┘          └───────┬───────┘
     │                        │                            │                           │                          │
     │     Initialize         │                            │                           │                          │
     │ ─────────────────────>│                            │                           │                          │
     │                        │                            │                           │                          │
     │                        │     Register services      │                           │                          │
     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│                           │                          │
     │                        │                            │                           │                          │
     │                        │        Register:           │                           │                          │
     │                        │        - storage           │                           │                          │
     │                        │        - configManager     │                           │                          │
     │                        │        - sourceManager     │                           │                          │
     │                        │        - errorService      │                           │                          │
     │                        │        - contentProcessor  │                           │                          │
     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                           │                          │
     │                        │                            │                           │                          │
     │     Ready              │                            │                           │                          │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                            │                           │                          │
     │                        │                            │                           │                          │
     │                        │                            │     Import app.js         │                          │
     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│                          │
     │                        │                            │                           │                          │
     │                        │        Get service         │                           │                          │
     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │
     │                        │        (contentController) │                           │                          │
     │                        │                            │                           │                          │
     │                        │      Return service        │                           │                          │
     │                        │ ─────────────────────────────────────────────────────>│                          │
     │                        │                            │                           │                          │
     │                        │                            │       Use service         │                          │
     │                        │                            │      (extractContent)     │                          │
     │                        │                            │ ─────────────────────────────────────────────────────>
     │                        │                            │                           │                          │
     │                        │        Get services        │                           │                          │
     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     │                        │        (storage,           │                           │                          │
     │                        │        errorService)       │                           │                          │
     │                        │                            │                           │                          │
     │                        │      Return services       │                           │                          │
     │                        │ ─────────────────────────────────────────────────────────────────────────────────>
     │                        │                            │                           │                          │
┌────┴─────┐          ┌───────┴─────────┐          ┌───────┴───────┐          ┌────────┴───────┐          ┌───────┴───────┐
│   App    │          │ Dependency      │          │ Service       │          │ Content        │          │ Controller    │
│ Bootstrap│          │ Container       │          │ Registry      │          │ Script         │          │ Components    │
└──────────┘          └─────────────────┘          └───────────────┘          └────────────────┘          └───────────────┘
```

## Domain Model

The following diagram shows the key domain models and their relationships:

```
┌────────────────┐     contains     ┌──────────────┐
│                │◄───────────────────             │
│  Presentation  │                  │    Slide     │
│                │                  │              │
└───────┬────────┘                  └──────┬───────┘
        │                                  │
        │ has                              │ has
        │                                  │
        ▼                                  ▼
┌────────────────┐                ┌──────────────┐
│   Source Type  │                │   Content    │
│  (notion, md)  │                │  (markdown)  │
└────────────────┘                └──────────────┘


┌─────────────────────────────────────────────────┐
│                                                 │
│                  ContentProcessor               │
│                                                 │
└─────────────┬───────────────────────────────────┘
              │
              │ processes
              │
              ▼
┌─────────────────────┐     creates     ┌───────────────────┐
│                     │────────────────►│                   │
│     Raw Content     │                 │  Normalized Slides │
│                     │                 │                   │
└─────────────────────┘                 └───────────────────┘


┌─────────────────────┐     loads      ┌───────────────────┐
│                     │◄───────────────┤                   │
│  Storage Service    │                │ Persistence Layer │
│                     │───────────────►│                   │
└─────────────────────┘     saves      └───────────────────┘
```

---

This architecture enables Notion Slides to support multiple content sources while maintaining a clean, modular, and extensible codebase. Key architectural benefits include:

1. **Domain-Driven Design** - Clear domain objects (Slide, Presentation) encapsulate business rules and validation logic
2. **Dependency Injection** - Components request dependencies through constructors rather than creating them directly
3. **Strategy Pattern** - Content extractors share a common interface but implement source-specific parsing logic
4. **Separation of Concerns** - Distinct layers for controllers, models, services, and rendering
5. **Error Handling** - Centralized error management with the ErrorService
6. **Configuration Management** - Unified configuration through the ConfigManager service
7. **Centralized Logging** - Consistent logging through the LoggingService with support for different levels and storage
8. **Comprehensive Testing** - Unit tests with Jest provide high code coverage for core components

By combining these patterns, the codebase is highly extensible (new content sources can be added with minimal changes), maintainable (components have clear responsibilities), and testable (dependencies can be easily mocked).

## Testing Architecture

The project uses Jest as its testing framework with a focus on unit testing core components:

```
tests/
  ├── setup.js                # Test environment setup with global mocks
  ├── extractors/             # Tests for content extractors
  │   ├── baseExtractor.test.js        # Tests for base extractor functionality
  │   └── notion/                      # Notion-specific extractor tests
  │       ├── blockquoteExtractor.test.js  # Tests for blockquote extraction
  │       ├── codeBlockExtractor.test.js   # Tests for code block extraction
  │       ├── headingExtractor.test.js     # Tests for heading extraction
  │       ├── imageExtractor.test.js       # Tests for image extraction
  │       ├── listExtractor.test.js        # Tests for list extraction
  │       ├── notionExtractor.test.js      # Tests for main Notion extractor
  │       ├── paragraphExtractor.test.js   # Tests for paragraph extraction
  │       └── tableExtractor.test.js       # Tests for table extraction
  └── services/               # Tests for application services
      └── __mocks__/          # Service mocks for testing
          └── LoggingService.js         # Mock for logging service
```

### Testing Strategy

1. **JSDOM Integration**: Tests use JSDOM to simulate DOM manipulation without a browser
2. **Mocking Services**: Core services are mocked to isolate components during testing
3. **High Coverage**: Focus on high test coverage for extractors (>90%) as they contain core business logic
4. **ES Module Support**: Configuration for testing ES modules with Jest
5. **Test Isolation**: Each test file focuses on a specific component with proper setup and teardown

### Running Tests

- Use `npm test` to run the test suite
- Use `npm test -- --coverage` to generate coverage reports
- Use `npm test -- <pattern>` to run specific test files
