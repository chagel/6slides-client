# Six Slides Architecture

This document outlines the architecture of the Six Slides Chrome extension, detailing how the system is structured to support multiple content sources and be extensible for future enhancements. The architecture follows Domain-Driven Design principles with clear domain models, dependency injection, and a layered approach that separates concerns while maintaining flexibility.

## Overview

**Six Slides** is a Chrome extension that transforms various content sources into elegant presentations. The codebase is written in **TypeScript**, providing type safety and better developer experience while maintaining the same architecture and design principles.

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

```typescript
// src/models/source_manager.ts
class SourceManager {
  detectSource(document: Document, url: string): SourceType | null {
    loggingService.debug('Detecting source type for:', url);
    
    // Check for Notion
    if (url.includes('notion.so') || url.includes('notion.site')) {
      loggingService.debug('Detected Notion source');
      return SourceType.NOTION;
    }
    
    // Check for Markdown file
    if (url.endsWith('.md') || url.endsWith('.markdown')) {
      loggingService.debug('Detected raw Markdown file source');
      return SourceType.MARKDOWN;
    }

    // Future sources can be added here (GitHub, GitLab, etc.)
    return null;
  }
  
  getExtractor(sourceType: SourceType | string, document: Document): BaseExtractor {
    loggingService.debug('Getting extractor for:', sourceType);
    
    switch (sourceType) {
      case SourceType.NOTION:
        return new NotionExtractor(document);
      case SourceType.MARKDOWN:
      case SourceType.GITHUB_MARKDOWN:
      case SourceType.GITLAB_MARKDOWN:
        return new MarkdownExtractor(document);
      // Additional sources can be added here
      default:
        const error = new Error(`Unsupported source type: ${sourceType}`);
        loggingService.error('Failed to get extractor', error);
        throw error;
    }
  }
}
```

### 2. Content Extractors

Each supported content source has its own extractor that knows how to parse content from that source. All extractors conform to a common interface.

```typescript
// src/models/extractors/base_extractor.ts
import { loggingService } from '../../services/logging_service';
import { Slide, ExtractorResult } from '../../types/index';

export abstract class BaseExtractor {
  protected document: Document;

  constructor(document: Document) {
    if (new.target === BaseExtractor) {
      throw new Error('BaseExtractor is an abstract class and cannot be instantiated directly');
    }
    
    this.document = document;
  }
  
  abstract extract(): Slide[];
  
  // Validates extracted content
  validateContent(slides: Slide[]): boolean {
    try {
      // Basic validation
      if (!Array.isArray(slides) || slides.length === 0) {
        loggingService.error('Invalid slides: Empty or not an array');
        return false;
      }
      
      // Check if each slide has the required properties
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (!slide.title && !slide.content) {
          loggingService.error(`Invalid slide at index ${i}: Missing title and content`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      loggingService.error('Error validating content', error);
      return false;
    }
  }
  
  // Utility methods available to all extractors
  findElements(selector: string): Element[] {
    return Array.from(this.document.querySelectorAll(selector));
  }
  
  hasClass(element: Element | null, className: string): boolean {
    if (!element || !element.className) return false;
    return typeof element.className === 'string' && 
           element.className.includes(className);
  }
  
  getElementText(element: Element | null): string {
    if (!element) return '';
    const text = (element as HTMLElement).innerText || element.textContent || '';
    return text.trim();
  }
  
  debug(message: string, data?: unknown): void {
    loggingService.debug(`[${this.constructor.name}] ${message}`, data || undefined);
  }
}

// src/models/extractors/notion/notion_extractor.ts
import { loggingService } from '../../../services/logging_service';
import { BaseExtractor } from '../base_extractor';
import { Slide } from '../../../types/index';

export class NotionExtractor extends BaseExtractor {
  heading_extractor: IHeadingExtractor;
  list_extractor: IListExtractor;
  code_block_extractor: ICodeBlockExtractor;
  table_extractor: ITableExtractor;
  blockquote_extractor: IBlockquoteExtractor;
  paragraph_extractor: IParagraphExtractor;
  image_extractor: IImageExtractor;

  constructor(document: Document) {
    super(document);
    
    // Initialize component extractors
    this.heading_extractor = new HeadingExtractor(document);
    this.list_extractor = new ListExtractor(document);
    this.code_block_extractor = new CodeBlockExtractor(document);
    this.table_extractor = new TableExtractor(document);
    this.blockquote_extractor = new BlockquoteExtractor(document);
    this.paragraph_extractor = new ParagraphExtractor(document);
    this.image_extractor = new ImageExtractor(document);
  }

  extract(): Slide[] {
    try {
      this.debug('Starting extraction from Notion page');
      
      // Notion-specific extraction logic using component extractors
      // Find H1 headings, extract content between them, etc.
      return [];
    } catch (error) {
      loggingService.error('Error extracting content from Notion page', error);
      return [];
    }
  }
}

// src/models/extractors/markdown/markdown_extractor.ts
import { loggingService } from '../../../services/logging_service';
import { BaseExtractor } from '../base_extractor';
import { Slide } from '../../../types/index';

export class MarkdownExtractor extends BaseExtractor {
  constructor(document: Document) {
    super(document);
  }

  extract(): Slide[] {
    try {
      this.debug('Starting extraction from Markdown');
      
      // Markdown-specific extraction logic
      // Parse markdown content and structure it into slides
      return [];
    } catch (error) {
      loggingService.error('Error extracting content from Markdown', error);
      return [];
    }
  }
}
```

### 3. Content Processor

The Content Processor normalizes content from different sources into a standard internal format. This ensures consistent processing regardless of the source.

```typescript
// src/models/contentProcessor.ts
import { Slide } from '../types';

class ContentProcessor {
  constructor() {
    // Initialize processor
  }
  
  process(rawContent: Slide[]): Slide[] {
    // Process and normalize content into slides
    // Example: Convert all heading formats to a standard one
    return this.normalizeSlides(rawContent);
  }
  
  private normalizeSlides(slides: Slide[]): Slide[] {
    // Apply standardization to all slides
    return slides;
  }
}
```

### 4. Storage Service

The Storage Service handles persistence, using a dual-storage strategy with localStorage for small data and IndexedDB for larger presentations.

```typescript
// src/models/storage.ts
import { Slide, Settings } from '../types';

class Storage {
  private isServiceWorker: boolean;

  constructor() {
    // Detect if we're running in a service worker context (no window object)
    this.isServiceWorker = typeof window === 'undefined' || 
                       !!(typeof globalThis !== 'undefined' && 
                          (globalThis as any).ServiceWorkerGlobalScope);
  }

  async saveSlides(slides: Slide[]): Promise<void> {
    // Save slides using appropriate storage
    // Use localStorage for small data in regular context
    // Use IndexedDB for larger presentations
    // In service worker context, can't use localStorage
  }
  
  async getSlides(): Promise<Slide[]> {
    // Retrieve slides based on environment
    return [];
  }
  
  getSettings(): Settings {
    try {
      if (this.isServiceWorker) {
        // In service worker context, return default settings
        return this.getDefaultSettings();
      }
      
      // In regular context, use localStorage
      return JSON.parse(localStorage.getItem('notionSlidesSettings') || '{}') as Settings;
    } catch (error) {
      console.error('Failed to get settings', error);
      return {} as Settings;
    }
  }
  
  private getDefaultSettings(): Settings {
    // Default settings for service worker context
    return {
      theme: "default",
      transition: "slide",
      slideNumber: false,
      center: true,
      debugLogging: false,
      extractionTimeout: 30
    };
  }
  
  // Other storage methods
}
```

### 5. Controllers

Controllers handle user interactions and coordinate the flow between UI and business logic.

```typescript
// src/controllers/contentController.ts
import { SourceManager } from '../models/sourceManager';
import { ContentProcessor } from '../models/contentProcessor';
import { Storage } from '../models/storage';
import { ErrorService } from '../services/ErrorService';
import { Slide } from '../types';

interface ExtractionResult {
  slides?: Slide[];
  sourceType?: string;
  error?: string;
}

class ContentController {
  /**
   * Constructor with dependency injection
   */
  constructor(
    private sourceManager: SourceManager,
    private contentProcessor: ContentProcessor,
    private storage: Storage,
    private errorService: ErrorService
  ) {}
  
  async extractContent(document: Document, url: string): Promise<ExtractionResult> {
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

```typescript
// src/models/domain/Slide.ts
import { SlideMetadata } from './types';

export class Slide {
  title: string;
  content: string;
  sourceType: string;
  metadata?: SlideMetadata;
  
  constructor(data: Partial<Slide> = {}) {
    this.title = data.title || '';
    this.content = data.content || '';
    this.sourceType = data.sourceType || 'unknown';
    this.metadata = data.metadata || {};
  }
  
  // Convert to markdown for presentation
  toMarkdown(): string {
    return `# ${this.title}\n\n${this.content}`;
  }
  
  // Validation logic
  isValid(): boolean {
    return !!this.title.trim();
  }
  
  // Serialization for storage
  toObject(): Record<string, unknown> {
    return {
      title: this.title,
      content: this.content,
      sourceType: this.sourceType,
      metadata: { ...this.metadata }
    };
  }
}

// src/models/domain/config.ts
export enum SubscriptionLevel {
  FREE = 'free',
  PRO = 'pro',
  VIP = 'vip'
}

export interface Config {
  // Presentation settings
  theme: string;
  transition: string;
  slideNumber: boolean;
  center: boolean;
  
  // Extension settings
  debugLogging: boolean;
  extractionTimeout: number;
  
  // Subscription settings
  subscriptionLevel: SubscriptionLevel;
  subscriptionExpiry: number | null;
  
  // User authentication
  userEmail: string | null;
  userToken: string | null;
  
  [key: string]: any;
}

// Default configuration values
export const DEFAULT_CONFIG: Config = {
  theme: 'default',
  transition: 'slide',
  slideNumber: false,
  center: true,
  debugLogging: false,
  extractionTimeout: 30,
  subscriptionLevel: SubscriptionLevel.FREE,
  subscriptionExpiry: null,
  userEmail: null,
  userToken: null
};
```

### 7. Logging Service

The Logging Service provides centralized logging functionality with support for different log levels and storage of log entries.

```javascript
// src/services/LoggingService.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
  timestamp: string;
}

interface LoggingConfig {
  debugEnabled?: boolean;
  logLevel?: LogLevel;
  storeDebugLogs?: boolean;
  prefix?: string;
}

class LoggingService {
  private _enabled: boolean;
  private _debugEnabled: boolean;
  private _logLevel: LogLevel;
  private _prefix: string;
  private _storeDebugLogs: boolean;
  
  constructor() {
    this._enabled = true;
    this._debugEnabled = false;
    this._logLevel = LogLevel.INFO;
    this._prefix = '[Six Slides]';
    this._storeDebugLogs = false;
  }
  
  // Initialize with configuration
  initialize(config: LoggingConfig = {}): void {
    if (typeof config.debugEnabled === 'boolean') this._debugEnabled = config.debugEnabled;
    if (config.logLevel) this._logLevel = config.logLevel;
    if (typeof config.storeDebugLogs === 'boolean') this._storeDebugLogs = config.storeDebugLogs;
    if (config.prefix) this._prefix = config.prefix;
  }
  
  // Log debug messages
  debug(message: string, data?: unknown): void {
    if (!this._enabled || !this._debugEnabled) return;
    
    this._log(LogLevel.DEBUG, message, data);
  }
  
  // Log error messages
  error(message: string, error?: Error | unknown): void {
    if (!this._enabled) return;
    
    const fullMessage = `${this._prefix} ${message}`;
    console.error(fullMessage, error || '');
    
    // Store error logs
    this._storeLog({
      level: LogLevel.ERROR,
      message: message,
      data: error ? (error instanceof Error ? error.message : error) : undefined,
      stack: error instanceof Error && error.stack ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
  
  // Private method to store logs
  private _storeLog(entry: LogEntry): void {
    // Implementation details for storing logs
  }
  
  // Additional methods for info, warn, etc.
}
```

### 8. Dependency Injection Container

The DI container manages service instances and their dependencies, promoting loose coupling.

```javascript
// src/services/DependencyContainer.ts
export type ServiceInstance = any; // Flexible type for various service implementations

export type FactoryFunction = (container: DependencyContainer) => ServiceInstance;

class DependencyContainer {
  private services: Map<string, ServiceInstance>;
  private factories: Map<string, FactoryFunction>;
  
  constructor() {
    this.services = new Map<string, ServiceInstance>();
    this.factories = new Map<string, FactoryFunction>();
  }
  
  // Register a service instance
  register(name: string, instance: ServiceInstance): void {
    this.services.set(name, instance);
  }
  
  // Register a factory function
  registerFactory(name: string, factory: FactoryFunction): void {
    this.factories.set(name, factory);
  }
  
  // Get service by name with generic type parameter
  get<T = ServiceInstance>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory(this);
      this.services.set(name, instance);
      return instance as T;
    }
    
    throw new Error(`Service "${name}" not found`);
  }
}
```

## Coding Standards

### File Naming Convention

All files in the codebase follow the `snake_case` naming convention:

- **Services**: `logging_service.ts`, `error_service.ts`, `dependency_container.ts`
- **Models**: `source_manager.ts`, `content_extractor.ts` 
- **Extractors**: `base_extractor.ts`, `notion_extractor.ts`, `markdown_extractor.ts`
- **Controllers**: `content_controller.ts`, `navigation.ts`

The `snake_case` convention was chosen for consistency and readability across the codebase.

## File Structure

```
src/
  ├── app.ts                  # Application bootstrap and content script functionality
  ├── common/                 # Shared utilities
  │   └── utils.ts            # Utility functions
  ├── controllers/            # Controllers connecting models and views
  │   ├── content_controller.ts # Content extraction orchestration
  │   ├── navigation.ts       # Navigation handling
  │   ├── popup/              # Popup UI controller
  │   │   └── index.ts        # Popup controller
  │   ├── settings/           # Settings UI controller
  │   │   └── index.ts        # Settings controller
  │   └── viewer/             # Viewer UI controller
  │       └── index.ts        # Viewer controller
  ├── models/                 # Business logic and data models
  │   ├── config_manager.ts   # Configuration management
  │   ├── content_extractor.ts # Main content extraction logic
  │   ├── content_processor.ts # Content normalization and processing
  │   ├── domain/             # Domain models
  │   │   ├── presentation.ts # Presentation domain model
  │   │   ├── slide.ts        # Slide domain model
  │   │   └── types.ts        # Domain model type definitions
  │   ├── extractors/         # Content extractors
  │   │   ├── base_extractor.ts      # Base extractor class
  │   │   ├── index.ts               # Extractor exports
  │   │   ├── markdown/              # Markdown extractors
  │   │   │   ├── index.ts           # Markdown extractor exports
  │   │   │   └── markdown_extractor.ts # Markdown extraction
  │   │   └── notion/                # Notion extractors
  │   │       ├── blockquote_extractor.ts # Blockquote extraction
  │   │       ├── code_block_extractor.ts  # Code block extraction
  │   │       ├── heading_extractor.ts    # Heading extraction
  │   │       ├── image_extractor.ts      # Image extraction
  │   │       ├── index.ts               # Notion extractor exports
  │   │       ├── list_extractor.ts       # List extraction
  │   │       ├── notion_extractor.ts     # Notion extraction coordinator
  │   │       ├── paragraph_extractor.ts  # Paragraph extraction
  │   │       └── table_extractor.ts      # Table extraction
  │   ├── renderer.ts         # Presentation rendering
  │   ├── source_manager.ts   # Source type detection and management
  │   └── storage.ts          # Data persistence (IndexedDB/localStorage)
  ├── services/               # Application services
  │   ├── dependency_container.ts # Dependency injection container
  │   ├── error_service.ts     # Centralized error handling
  │   ├── logging_service.ts   # Centralized logging service
  │   ├── messaging_service.ts # Inter-component communication (formerly in common/)
  │   ├── service_registry.ts  # Service registration
  │   └── worker.ts           # Service worker (background script)
  ├── types/                  # TypeScript type definitions
  │   ├── index.ts            # Shared type definitions
  │   └── storage.ts          # Storage-specific type definitions
  ├── views/                  # HTML views
  │   ├── about.html          # About page
  │   ├── popup.html          # Popup UI
  │   ├── settings.html       # Settings page
  │   ├── components/          # Component templates 
  │   │   ├── sidebar.html     # Sidebar component
  │   │   ├── about-content.html  # About content
  │   │   └── ...              # Other components
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


┌─────────────────────┐     imports    ┌───────────────────┐
│                     │◄───────────────┤                   │
│  Config Manager     │                │  Domain Config    │
│                     │                │                   │
└─────────────────────┘                └───────────────────┘
        ▲                                      ▲
        │ uses                                 │
        │                                      │ imports
┌───────┴─────────┐                    ┌───────┴─────────┐
│                 │                    │                 │
│    Storage      │─────imports────────►    Components   │
│                 │                    │                 │
└─────────────────┘                    └─────────────────┘
```

---

This architecture enables Six Slides to support multiple content sources while maintaining a clean, modular, and extensible codebase. Key architectural benefits include:

1. **TypeScript Integration** - Strong typing throughout the codebase for improved safety and developer experience
2. **Domain-Driven Design** - Clear domain objects with TypeScript interfaces encapsulate business rules and validation logic
3. **Dependency Injection** - Components request dependencies through type-safe constructors
4. **Strategy Pattern** - Content extractors share a common abstract class and interfaces but implement source-specific parsing logic
5. **Separation of Concerns** - Distinct layers for controllers, models, services, and rendering with appropriate interfaces
6. **Error Handling** - Centralized error management with the error_service and proper error typing
7. **Configuration Management** - Unified configuration through the config_manager service with typed configs
8. **Centralized Logging** - Consistent logging through the logging_service with type-safe logging methods and enums
9. **Consistent Naming Convention** - All files follow the snake_case naming convention for improved readability and consistency
10. **Service-Oriented Architecture** - Common utilities like messaging are implemented as services to promote better dependency management
11. **Comprehensive Testing** - TypeScript-based unit tests with Jest provide high code coverage for core components
12. **Service Worker Awareness** - Environment detection for cross-context compatibility (browser vs. service worker)
13. **Domain Configuration** - Configuration types and defaults live in the domain folder, ensuring proper separation of concerns
14. **Dependency Resolution** - Careful handling of module imports to avoid circular dependencies

By combining these patterns, the codebase is highly extensible (new content sources can be added with minimal changes), maintainable (components have clear responsibilities), and testable (dependencies can be easily mocked). The TypeScript integration ensures type safety across the entire codebase, reducing runtime errors and improving developer productivity. The domain-driven organization of configuration types also ensures that changes to configuration can be made safely without introducing circular dependencies.

## Testing Architecture

The project uses Jest as its testing framework with a focus on unit testing core components:

```
tests/
  ├── setup.ts                # Test environment setup with global mocks
  ├── extractors/             # Tests for content extractors
  │   ├── base_extractor.test.ts        # Tests for base extractor functionality
  │   └── notion/                      # Notion-specific extractor tests
  │       ├── blockquote_extractor.test.ts  # Tests for blockquote extraction
  │       ├── code_block_extractor.test.ts   # Tests for code block extraction
  │       ├── heading_extractor.test.ts     # Tests for heading extraction
  │       ├── image_extractor.test.ts       # Tests for image extraction
  │       ├── list_extractor.test.ts        # Tests for list extraction
  │       ├── notion_extractor.test.ts      # Tests for main Notion extractor
  │       ├── paragraph_extractor.test.ts   # Tests for paragraph extraction
  │       └── table_extractor.test.ts       # Tests for table extraction
  └── services/               # Tests for application services
      └── __mocks__/          # Service mocks for testing
          └── logging_service.ts     # Type-safe mock services for testing
```

### Testing Strategy

1. **JSDOM Integration**: Tests use JSDOM to simulate DOM manipulation without a browser
2. **TypeScript Integration**: Tests are written in TypeScript with proper type definitions
3. **Mocking Services**: Core services are mocked with type-safe implementations to isolate components during testing
4. **High Coverage**: Focus on high test coverage for extractors (>90%) as they contain core business logic
5. **ES Module Support**: Configuration for testing ES modules with TypeScript and Jest
6. **Test Isolation**: Each test file focuses on a specific component with proper setup and teardown
7. **Type Assertions**: Non-null assertions are used where appropriate to handle DOM element testing
8. **Mock Type Safety**: Mock functions include proper TypeScript type definitions

### Running Tests

- Use `npm test` to run the test suite
- Use `npm test -- --coverage` to generate coverage reports
- Use `npm test -- <pattern>` to run specific test files
- Use `npm run tsc` to check TypeScript types before running tests
