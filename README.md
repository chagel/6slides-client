# Notion to Slides

A Chrome extension that converts Notion pages to Reveal.js presentations using markdown. Format your Notion page with proper headings and see it transformed into beautiful slides.

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the repository folder
5. The extension icon should now appear in your browser toolbar

## Usage

1. **Format your Notion page** using the markdown template structure (see below)
2. Navigate to your Notion page
3. Click the extension icon
4. Click "Convert This Page"
5. A new tab will open with your presentation

## Template Format

This extension requires your Notion page to follow a specific markdown template format:

### Structure

- **H1 headings (#)** define slide titles and start new slides
- **H2 headings (##)** are section titles within slides
- **H3 headings (###)** are subsection titles
- **Bullet points (- or *)** are preserved as lists
- **Regular text** becomes paragraphs
- Content between H1s belongs to the previous H1

### Example

```markdown
# Main Title (Slide 1)
Introduction text

# Section 1 (Slide 2)
## Subsection 1.1
- Bullet point 1
- Bullet point 2

# Section 2 (Slide 3)
Content for section 2
```

### Standard Markdown Features

Since the content is rendered as markdown, you can use all standard markdown features:

- **Bold text**: `**bold**` → **bold**
- *Italic text*: `*italic*` → *italic*
- `Code`: `` `code` `` → `code`
- [Links](https://example.com): `[Links](https://example.com)`
- Images: `![alt text](image-url.jpg)`
- Horizontal rules: `---`
- Blockquotes: `> quoted text`

## Features

- Clean, Notion-inspired slide design
- Full markdown support
- Automatic slide transitions
- Keyboard navigation
- Slide numbers
- Help overlay (press ? during presentation)

## How It Works

1. The extension extracts content from Notion pages by looking for headings and content
2. Content is structured as markdown with H1 headings defining slide boundaries
3. Reveal.js's built-in markdown plugin renders the markdown content as slides
4. Styling is applied to maintain a clean, Notion-inspired look

## Development

- The extension uses manifest v3
- Content is extracted from Notion using DOM traversal
- Reveal.js is used for the presentation framework with its markdown plugin
- No build process is required

## License

MIT