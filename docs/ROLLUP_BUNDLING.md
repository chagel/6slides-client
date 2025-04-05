# Rollup Bundling for Notion Slides Extension

This document explains the Rollup bundling implementation for the Notion Slides Chrome extension.

## Problem Solved

The extension was experiencing issues with ES modules in Chrome extension context:

1. The popup.html and other UI components used `<script type="module">` tags which weren't properly functioning in the extension context.
2. Import paths were causing issues when trying to load modules from different directories.
3. Content scripts needed to be injected in non-module context but still benefit from modular code organization.

## Solution

We implemented Rollup bundling with the following approach:

### 1. Bundling Strategy

- **Background Service Worker**: Uses ESM format since Chrome extension service workers support ES modules
- **Content Scripts**: 
  - Consolidated into a single IIFE bundle for direct execution in the content script context
  - No need for dynamic imports or separate entry points
- **UI Controllers (Popup, Settings, Viewer)**: 
  - IIFE format for compatibility with regular script tags
  - Eliminates need for module-type scripts in HTML files

### 2. Implementation Details

1. **Rollup Configuration**:
   - Different output formats for different parts of the extension
   - Single IIFE bundle for content script with all dependencies included
   - Separate entries for models, controllers, and utilities
   - Preserves imports of Chrome APIs 

2. **HTML File Updates**:
   - Changed `<script type="module">` to standard `<script>` tags
   - Updated paths to use bundled scripts

3. **Build Process Enhancement**:
   - New build script runs Rollup to bundle modules
   - Copies static assets and updates HTML files automatically
   - Preserves organization of the codebase for development

### 3. Directory Structure

The project maintains its modular MVC architecture:

```
src/
  ├── common/           # Shared utilities
  ├── models/           # Data models and business logic
  │   └── extractors/   # Content extractors
  ├── controllers/      # UI controllers
  ├── views/            # HTML views
  ├── content/          # Content scripts
  └── background/       # Background service worker
```

## Benefits

1. **Compatibility**: Works across all parts of the Chrome extension without module loading issues
2. **Maintainability**: Preserves modular code organization for development
3. **Performance**: Bundles related code together with proper dependency management
4. **Developer Experience**: Maintain ES modules during development, output compatible formats for runtime
5. **Extensibility**: Easy to add new modules in a structured way

## Testing and Usage

- Build with `npm run build` (runs Rollup bundling)
- Watch for changes with `npm run watch`
- Load the extension from the `dist` directory