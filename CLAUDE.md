# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- No build process required (Chrome extension)
- Load unpacked extension in Chrome: chrome://extensions/ → Developer mode → Load unpacked
- Test in Chrome by navigating to a Notion page and using the extension
- Manual testing: check conversion from Notion pages to reveal.js slides

## Code Style Guidelines
- JavaScript: Use modern ES6+ syntax with async/await for async operations
- Format: 2-space indentation, semicolons, single quotes preferred
- Naming: camelCase for variables/functions, descriptive names
- Error handling: Use try/catch for async operations, check chrome API responses
- Chrome Extension API: Follow Chrome extension Manifest V3 guidelines
- HTML: Keep markup semantic and minimal
- CSS: Use classes for styling
- Comments: Add comments for complex logic only