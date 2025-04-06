# Notion Slides Architecture

This document outlines the architecture of the Notion Slides Chrome extension, detailing how the system is structured to support multiple content sources and be extensible for future enhancements.

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

The extension follows the Model-View-Controller (MVC) architecture with a focus on modularity and extensibility through the use of strategy and adapter patterns.

```
┌────────────────────────────────┐
│           User Interface       │
│  (popup.html, settings.html)   │
└─────────────┬──────────────────┘
              │
              v
┌────────────────────────────────┐
│          Controllers           │
│   (coordinate user actions)    │
└─────────────┬──────────────────┘
              │
              v
┌────────────────────────────────┐
│     Content Source Manager     │◄────┐
│  (determines content source)   │     │
└─────────────┬──────────────────┘     │
              │                         │
              v                         │
┌────────────────────────────────┐     │
│      Content Extractors        │     │
│ (source-specific extraction)   │     │
└─────────────┬──────────────────┘     │
              │                         │
              v                         │
┌────────────────────────────────┐     │
│       Content Processor        │     │
│   (normalizes all content)     │     │
└─────────────┬──────────────────┘     │
              │                         │
              v                         │
┌────────────────────────────────┐     │
│         Slide Renderer         │     │
│   (creates slide presentation) │     │
└─────────────┬──────────────────┘     │
              │                         │
              v                         │
┌────────────────────────────────┐     │
│        Storage Service         │─────┘
│  (saves slides & preferences)  │
└────────────────────────────────┘
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
  constructor() {
    this.sourceManager = new SourceManager();
    this.contentProcessor = new ContentProcessor();
    this.storage = new Storage();
  }
  
  async extractContent(document, url) {
    // Detect source type
    const sourceType = this.sourceManager.detectSource(document, url);
    if (!sourceType) {
      throw new Error('Unsupported content source');
    }
    
    // Get appropriate extractor
    const extractor = this.sourceManager.getExtractor(sourceType, document);
    
    // Extract and process content
    const rawContent = extractor.extract();
    const slides = this.contentProcessor.process(rawContent);
    
    // Save and return
    await this.storage.saveSlides(slides);
    return slides;
  }
}
```

## Implementation Strategy

### Phase 1: Refactor Existing Notion Support

1. Extract Notion-specific logic into dedicated extractors
2. Implement the Source Manager
3. Update the content script to use the new architecture

### Phase 2: Add Markdown Support

1. Implement the Markdown extractor
2. Add content detection for Markdown files
3. Test and refine the Markdown support

### Phase 3: Enhance for Scalability

1. Improve the Source Manager to dynamically load extractors
2. Create a plugin system for new content sources
3. Add caching and performance optimizations

## File Structure

```
src/
  ├── common/           # Shared utilities and services
  ├── models/           # Business logic 
  │   ├── sourceManager.js        # Source detection and extractor factory
  │   ├── contentProcessor.js     # Content normalization
  │   ├── storage.js              # Data persistence
  │   ├── renderer.js             # Presentation rendering
  │   └── extractors/             # Source-specific extractors
  │       ├── baseExtractor.js    # Base extractor interface
  │       ├── notionExtractor.js  # Notion-specific extraction
  │       ├── markdownExtractor.js # Markdown-specific extraction
  │       └── components/         # Shared extraction components
  │           ├── headingExtractor.js
  │           ├── listExtractor.js
  │           └── codeBlockExtractor.js
  ├── controllers/      # Controllers connecting models and views
  │   ├── contentController.js   # Content extraction orchestration
  │   ├── popup/                 # Popup UI controller
  │   ├── settings/              # Settings UI controller
  │   └── viewer/                # Presentation viewer controller
  ├── views/            # HTML views
  ├── content/          # Content script for injection
  └── background/       # Background service worker
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

---

This architecture enables Notion Slides to support multiple content sources while maintaining a clean, modular, and extensible codebase. The strategy and adapter patterns allow for easy addition of new content sources without significant changes to the core logic.