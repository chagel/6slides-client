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

## Credits and Licenses

This extension includes open source components:

- [reveal.js](https://revealjs.com/) - Framework for creating presentations (MIT License)
- [Catppuccin](https://github.com/catppuccin/catppuccin) - Pastel theme color palette (MIT License)

Full license details can be found in LICENSE.md.

## Development

### Setup

1. Clone this repository
2. Load the extension in Chrome using "Load unpacked" in developer mode
3. Navigate to a Notion page and test the extension

### Building for Production

When building for production, make sure to:
- Minify JavaScript files
- Include all necessary attribution and license information
- Update the version number in manifest.json

## License

This extension is licensed under [Your License Here].
The open source components are used under their respective licenses (MIT).