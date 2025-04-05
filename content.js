/**
 * Notion to Slides - Content Script
 * 
 * This script extracts content from Notion pages using a specific template format
 * and converts it into markdown for reveal.js to render as slides.
 * 
 * Template Format:
 * - H1 elements (#) define slide titles and start new slides
 * - H2 elements (##) are section titles within slides
 * - H3 elements (###) are subsection titles
 * - Bullet points (- or *) are preserved as lists
 * - Paragraphs become regular text
 * - Content between H1s belongs to the previous H1
 */

/**
 * Main function to extract content from a Notion page
 * @returns {string[]} Array of markdown strings, one per slide
 */
function extractNotionContent() {
  console.log("Extracting content using template format...");
  
  // Build slides directly as markdown strings
  const slides = extractSlidesAsMarkdown();
  
  // Debug output - log the full markdown content
  console.log("=== EXTRACTED MARKDOWN CONTENT ===");
  slides.forEach((slide, index) => {
    console.log(`\n--- SLIDE ${index + 1} ---\n`);
    console.log(slide);
    
    // Count heading types
    const h1Count = (slide.match(/^# /gm) || []).length;
    const h2Count = (slide.match(/^## /gm) || []).length;
    const h3Count = (slide.match(/^### /gm) || []).length;
    
    console.log(`  Heading counts: H1=${h1Count}, H2=${h2Count}, H3=${h3Count}`);
    
    // Check for issues
    if (h1Count !== 1) {
      console.warn(`Slide ${index + 1} has ${h1Count} H1 headings (should have exactly 1)`);
    }
    
    // Log the specific content structure with proper heading identification
    const lines = slide.split('\n').filter(l => l.trim());
    console.log(`  Content structure: ${lines.length} lines`);
    lines.forEach((line, lineIndex) => {
      if (line.startsWith('# ')) {
        console.log(`  Line ${lineIndex + 1}: H1 Heading - ${line}`);
      } else if (line.startsWith('## ')) {
        console.log(`  Line ${lineIndex + 1}: H2 Heading - ${line}`);
      } else if (line.startsWith('### ')) {
        console.log(`  Line ${lineIndex + 1}: H3 Heading - ${line}`);
      } else if (line.startsWith('-')) {
        console.log(`  Line ${lineIndex + 1}: List item - ${line}`);
      } else {
        console.log(`  Line ${lineIndex + 1}: Paragraph - ${line.substring(0, 30)}${line.length > 30 ? '...' : ''}`);
      }
    });
  });
  console.log("=== END OF MARKDOWN CONTENT ===");
  
  return slides;
}

/**
 * Extract slides directly as markdown strings
 * @returns {string[]} Array of markdown-formatted slide strings
 */
function extractSlidesAsMarkdown() {
  // Find all H1 headings to identify slide boundaries
  const h1Elements = findHeadingsOfLevel(1);
  
  if (h1Elements.length === 0) {
    console.warn("No H1 headings found. Template format requires H1 headings to define slides.");
    return [];
  }
  
  console.log(`Found ${h1Elements.length} H1 headings for slides`);
  
  const slides = [];
  
  // Process each H1 heading to create a slide
  h1Elements.forEach((h1, index) => {
    // Get the content for this slide - everything until the next H1 or end of document
    const nextH1 = h1Elements[index + 1] || null;
    const slideMarkdown = extractSlideContent(h1, nextH1);
    
    if (slideMarkdown.trim()) {
      slides.push(slideMarkdown);
    }
  });
  
  console.log(`Created ${slides.length} slides from template format`);
  return slides;
}

/**
 * Find all headings of a specific level (h1, h2, h3)
 * @param {number} level - Heading level to find (1, 2, or 3)
 * @returns {Element[]} Array of heading elements
 */
function findHeadingsOfLevel(level) {
  // Build selectors for both HTML and Notion-specific headings
  let selectors = [];
  
  // Standard HTML selector
  selectors.push(`h${level}`);
  
  // Notion-specific selectors
  if (level === 1) {
    selectors.push('.notion-header-block');
    selectors.push('[class*="notion-h1"]');
  } else if (level === 2) {
    selectors.push('[class*="notion-h2"]');
  } else if (level === 3) {
    selectors.push('[class*="notion-h3"]');
  }
  
  // Query all matching elements
  return Array.from(document.querySelectorAll(selectors.join(', ')));
}

/**
 * Extract content for a slide as markdown
 * @param {Element} h1Element - The H1 heading element for this slide
 * @param {Element|null} nextH1 - The next H1 heading element (or null if last slide)
 * @returns {string} Markdown content for the slide
 */
function extractSlideContent(h1Element, nextH1) {
  // Start with the H1 text as the slide title - format as markdown H1
  const title = h1Element.innerText.trim();
  let slideContent = `# ${title}`;
  
  // Get all subsequent elements until the next H1
  let currentElement = h1Element.nextElementSibling;
  
  // Process content until we reach the next H1 or run out of elements
  while (currentElement && currentElement !== nextH1) {
    // Skip empty elements
    if (!currentElement.innerText.trim()) {
      currentElement = currentElement.nextElementSibling;
      continue;
    }
    
    // Process based on element type
    const elementContent = processElementForMarkdown(currentElement);
    
    // Add content if it exists and isn't duplicated
    if (elementContent && elementContent.trim() && !slideContent.includes(elementContent)) {
      slideContent += `\n\n${elementContent}`;
    }
    
    currentElement = currentElement.nextElementSibling;
  }
  
  return slideContent;
}

/**
 * Process an element to extract its markdown content
 * @param {Element} element - The DOM element to process
 * @returns {string} Markdown content or empty string
 */
function processElementForMarkdown(element) {
  // Skip elements without content
  if (!element || !element.innerText || !element.innerText.trim()) {
    return '';
  }

  // Check for headings (H2, H3)
  if (isHeadingElement(element, 2)) {
    return `## ${element.innerText.trim()}`;
  }
  
  if (isHeadingElement(element, 3)) {
    return `### ${element.innerText.trim()}`;
  }
  
  // Check for lists
  if (isListElement(element)) {
    return processListElement(element);
  }
  
  // Regular paragraph
  const text = element.innerText.trim();
  
  // Skip empty paragraphs or ones that look like markdown headings (to avoid duplication)
  if (!text || text.startsWith('#')) {
    return '';
  }
  
  // Check if this is actually a list item in a paragraph
  if (text.startsWith('-') || text.startsWith('*')) {
    // Single list item - just return as-is
    return text;
  }
  
  // Regular paragraph
  return text;
}

/**
 * Check if an element is a heading of a specific level
 * @param {Element} element - Element to check
 * @param {number} level - Heading level (1, 2, or 3)
 * @returns {boolean} True if element is a heading of the specified level
 */
function isHeadingElement(element, level) {
  // Standard HTML heading
  if (element.tagName === `H${level}`) {
    return true;
  }
  
  // Notion-specific heading classes
  const className = element.className || '';
  
  if (level === 1 && (
    className.includes('notion-header-block') || 
    className.includes('notion-h1')
  )) {
    return true;
  }
  
  if (level === 2 && className.includes('notion-h2')) {
    return true;
  }
  
  if (level === 3 && className.includes('notion-h3')) {
    return true;
  }
  
  return false;
}

/**
 * Check if an element is a list (ul, ol, or Notion list)
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is a list
 */
function isListElement(element) {
  return element.tagName === 'UL' || 
         element.tagName === 'OL' || 
         (element.className && (
           element.className.includes('notion-bulleted_list') ||
           element.className.includes('notion-numbered_list')
         ));
}

/**
 * Process a list element and convert to markdown
 * @param {Element} listElement - The list element (ul, ol)
 * @returns {string} Markdown formatted list
 */
function processListElement(listElement) {
  const items = Array.from(listElement.querySelectorAll('li'))
    .map(li => li.innerText.trim())
    .filter(text => text); // Filter out empty items
  
  if (items.length === 0) {
    return '';
  }
  
  // Convert to markdown bullet list
  return items.map(item => `- ${item}`).join('\n');
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ping action to check if content script is loaded
  if (request.action === "ping") {
    sendResponse({ status: "content_script_ready" });
    return true;
  }
  
  // Extract content action
  if (request.action === "extract_content") {
    console.log("Extracting content from Notion page...");
    
    try {
      // Use setTimeout to ensure the DOM is fully loaded and accessible
      setTimeout(() => {
        try {
          const slides = extractNotionContent();
          
          if (!slides || slides.length === 0) {
            sendResponse({ 
              error: "No slides found. Make sure your page has H1 headings to define slides." 
            });
          } else {
            console.log(`Successfully extracted ${slides.length} slides`);
            sendResponse({ slides });
          }
        } catch (error) {
          console.error("Error during extraction:", error);
          console.error("Stack trace:", error.stack);
          
          // Create a detailed error response
          sendResponse({ 
            error: "Error extracting slides: " + (error.message || "Unknown error"),
            stack: error.stack
          });
        }
      }, 300); // Short delay to ensure DOM is accessible
      
      // Return true to indicate we'll respond asynchronously
      return true;
    } catch (error) {
      console.error("Error setting up extraction:", error);
      sendResponse({ error: "Failed to initialize content extraction." });
      return false;
    }
  }
  
  // Always return true for async response
  return true;
});