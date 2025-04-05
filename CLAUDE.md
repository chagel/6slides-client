# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- No build process required (Chrome extension)
- Load unpacked extension in Chrome: chrome://extensions/ → Developer mode → Load unpacked
- Test in Chrome by navigating to a Notion page with proper heading structure
- Manual testing: ensure H1 headings create new slides and content is properly converted to markdown

## Template Format 
The extension follows a specific markdown-based template format:
- H1 elements (#) define slide titles and start new slides
- H2 elements (##) are section titles within slides
- H3 elements (###) are subsection titles
- Content between H1s belongs to the previous H1
- Bullet points (- or *) are preserved as lists
- Regular text becomes paragraphs
- Standard markdown syntax (bold, italic, links, etc.) is supported

## Architecture
- **content.js**: Extracts content from Notion pages and converts to markdown
- **viewer.js**: Renders extracted markdown directly with reveal.js 
- **viewer.html**: Simple container for the presentation
- **background.js**: Handles extension lifecycle and messaging
- **popup.js/html**: User interface for the extension

## Code Style Guidelines
- JavaScript: Use modern ES6+ syntax, prefer async/await for async operations
- Functions: Use JSDoc comments for all functions, small single-purpose functions
- Format: 2-space indentation, semicolons, single quotes for strings
- Naming: camelCase for variables/functions, descriptive names
- Error handling: Use try/catch for DOM operations and async code
- Chrome Extension API: Follow Chrome extension Manifest V3 guidelines
- HTML: Keep markup semantic and minimal
- CSS: Use CSS variables for theming