function extractNotionContent() {
  const blocks = [];
  
  // Debug DOM structure to help identify Notion structure
  console.log("Searching for Notion content structure...");
  
  // Log potential Notion content containers
  console.log("Main elements:", document.querySelectorAll('main').length);
  console.log("Elements with notion in class:", document.querySelectorAll('[class*="notion"]').length);
  
  // Try common Notion DOM patterns
  const selectors = [
    'main.notion-frame',
    'div.notion-frame',
    'div.notion-page-content',
    'div.notion-scroller',
    'div[data-content-editable-root="true"]',
    'div.notion-page-block'
  ];
  
  // Log what selectors we find
  selectors.forEach(selector => {
    const els = document.querySelectorAll(selector);
    console.log(`Found ${els.length} elements matching: ${selector}`);
  });
  
  // Get the main Notion content area
  const notionFrame = document.querySelector('main.notion-frame');
  if (!notionFrame) {
    console.warn("Could not find main.notion-frame");
    
    // Try alternative selectors for Notion's main content
    const altContainers = [
      document.querySelector('div.notion-frame'),
      document.querySelector('div.notion-page-block'),
      document.querySelector('div[data-content-editable-root="true"]'),
      ...document.querySelectorAll('[class*="notion-page"]')
    ].filter(Boolean);
    
    if (altContainers.length > 0) {
      console.log(`Found ${altContainers.length} alternative Notion containers`);
      return extractFromElement(altContainers[0]);
    }
    
    // Fallback to body if specific frame not found
    return extractFromBody();
  }
  
  // Find the actual page content in the frame
  const pageContent = notionFrame.querySelector('.notion-page-content');
  if (!pageContent) {
    console.warn("Could not find .notion-page-content");
    // Fallback to the frame itself
    return extractFromElement(notionFrame);
  }
  
  return extractFromElement(pageContent);
}

// Extract content from body as fallback
function extractFromBody() {
  console.log("Falling back to body content extraction");
  const blocks = [];
  
  // Try to find headings first for slides
  const headings = document.querySelectorAll('h1, h2, h3');
  if (headings.length > 0) {
    headings.forEach(heading => {
      const text = heading.innerText.trim();
      if (text) blocks.push(text);
    });
    return blocks;
  }
  
  // If no headings, try paragraphs
  const paragraphs = document.querySelectorAll('p');
  paragraphs.forEach(p => {
    const text = p.innerText.trim();
    if (text) blocks.push(text);
  });
  
  return blocks;
}

// Extract content from a specific element
function extractFromElement(element) {
  const blocks = [];
  
  // First try: Look for Notion blocks with content using data-block-id
  let notionBlocks = element.querySelectorAll('[data-block-id]');
  
  // If no data-block-id elements found, try various Notion block patterns
  if (notionBlocks.length === 0) {
    console.log("No data-block-id elements found, trying alternative Notion selectors");
    
    // Try modern Notion blocks (new UI)
    const modernSelectors = [
      // Common selectors for latest Notion
      'div[contenteditable="true"]',
      'div[class*="notionBlock"]',
      'div[class*="block"]'
    ];
    
    for (const selector of modernSelectors) {
      const elements = element.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements matching: ${selector}`);
        notionBlocks = elements;
        break;
      }
    }
  }
  
  // If we still don't have blocks, try headings and paragraphs
  if (notionBlocks.length === 0) {
    console.log("No Notion blocks found, looking for headings and paragraphs");
    
    // Find headings for slide titles
    const headings = element.querySelectorAll('h1, h2, h3, [class*="heading"], [class*="title"]');
    headings.forEach(heading => {
      const text = heading.innerText.trim();
      if (text) blocks.push({ type: 'heading', text });
    });
    
    // Find paragraphs for content
    const paragraphs = element.querySelectorAll('p, [class*="paragraph"], [class*="text-block"]');
    paragraphs.forEach(p => {
      const text = p.innerText.trim();
      if (text) blocks.push({ type: 'paragraph', text });
    });
    
    // If we found typed content, format it properly
    if (blocks.length > 0) {
      return formatBlocks(blocks);
    }
    
    // Try div elements with substantial text content
    const contentDivs = Array.from(element.querySelectorAll('div')).filter(div => {
      const text = div.innerText.trim();
      // Only consider divs with substantial text that are likely content blocks
      return text.length > 30 && text.length < 1000 && 
             !div.querySelector('div') && // Not containing other divs
             !div.parentElement.classList.contains('notion-selectable'); // Not selectable containers
    });
    
    if (contentDivs.length > 0) {
      console.log(`Found ${contentDivs.length} content divs`);
      contentDivs.forEach(div => {
        blocks.push({ type: 'paragraph', text: div.innerText.trim() });
      });
      return formatBlocks(blocks);
    }
    
    // Last resort: just get text nodes with some content
    console.log("No structured content found, extracting text nodes");
    return extractTextContent(element);
  }
  
  // Process Notion blocks
  console.log(`Found ${notionBlocks.length} potential Notion blocks`);
  const typedBlocks = [];
  
  notionBlocks.forEach(block => {
    const text = block.innerText.trim();
    if (!text) return;
    
    // Try to determine block type
    const isHeading = 
      block.querySelector('[class*="heading"]') || 
      block.querySelector('[class*="title"]') ||
      block.classList.contains('notion-header-block') ||
      block.tagName === 'H1' || block.tagName === 'H2' || block.tagName === 'H3' ||
      text.length < 50; // Short text blocks are likely headings
        
    if (isHeading) {
      typedBlocks.push({ type: 'heading', text });
    } else {
      typedBlocks.push({ type: 'paragraph', text });
    }
  });
  
  return formatBlocks(typedBlocks);
}

// Format blocks into slide content
function formatBlocks(blocks) {
  // If we have no blocks, return empty array
  if (!blocks || blocks.length === 0) {
    return [];
  }
  
  // If we have very few blocks, make them all separate slides
  if (blocks.length <= 3) {
    return blocks.map(b => b.text || b);
  }
  
  const slides = [];
  let currentSlide = null;
  let slideContent = [];
  
  // Group blocks into slides
  blocks.forEach(block => {
    const blockText = block.text || block;
    const blockType = block.type || (blockText.length < 50 ? 'heading' : 'paragraph');
    
    if (blockType === 'heading') {
      // Start a new slide if we already have content
      if (slideContent.length > 0) {
        slides.push(slideContent.join('\n'));
        slideContent = [];
      }
      // Add heading as first element of new slide
      slideContent.push(blockText);
    } else {
      // Add paragraph to current slide
      // If we don't have a slide yet, start one with this paragraph
      slideContent.push(blockText);
      
      // If we have a lot of content already, finish this slide
      // This prevents slides from getting too big
      if (slideContent.length >= 4) {
        slides.push(slideContent.join('\n'));
        slideContent = [];
      }
    }
  });
  
  // Add any remaining content as the last slide
  if (slideContent.length > 0) {
    slides.push(slideContent.join('\n'));
  }
  
  // If we still have no slides, try a different approach - make each block a slide
  if (slides.length === 0) {
    return blocks.map(b => b.text || b);
  }
  
  // If we have very few slides but many blocks, we might need to split them further
  if (slides.length === 1 && blocks.length > 8) {
    // Split the one large slide into multiple slides
    const content = slides[0].split('\n');
    const splitSlides = [];
    
    // Group every 3-4 lines into a slide
    for (let i = 0; i < content.length; i += 3) {
      const slideContent = content.slice(i, i + 3).join('\n');
      if (slideContent.trim()) {
        splitSlides.push(slideContent);
      }
    }
    
    return splitSlides;
  }
  
  return slides;
}

// Extract plain text as last resort
function extractTextContent(element) {
  const blocks = [];
  const textNodes = [];
  
  // Get all text nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT },
    false
  );
  
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text && text.length > 20) { // Only consider substantial content
      textNodes.push(text);
    }
  }
  
  // Group text into potential slides (every 3-4 items)
  for (let i = 0; i < textNodes.length; i += 3) {
    const slideContent = textNodes.slice(i, i + 3).join('\n');
    if (slideContent) {
      blocks.push(slideContent);
    }
  }
  
  return blocks;
}

// Listen for content script messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  // Ping action to check if content script is loaded
  if (request.action === "ping") {
    sendResponse({ status: "content_script_ready" });
    return true;
  }
  
  // Extract content action
  if (request.action === "extract_content") {
    console.log("Extracting content from page...");
    
    try {
      // Add delay to ensure DOM is fully loaded
      setTimeout(() => {
        try {
          const slides = extractNotionContent();
          console.log(`Extracted ${slides.length} slides`);
          
          if (slides.length === 0) {
            sendResponse({ 
              error: "No content found. The page may still be loading or has a structure we can't parse." 
            });
          } else {
            sendResponse({ slides });
          }
        } catch (innerError) {
          console.error("Error during extraction:", innerError);
          sendResponse({ error: innerError.message });
        }
      }, 500); // Small delay to ensure DOM is ready
      
      // Return true for async response
      return true;
    } catch (error) {
      console.error("Error setting up extraction:", error);
      sendResponse({ error: error.message });
    }
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});