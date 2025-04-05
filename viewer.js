// Get slides data and debug info from localStorage
const slides = JSON.parse(localStorage.getItem("slides") || "[]");
const debugInfo = JSON.parse(localStorage.getItem("slideDebugInfo") || "{}");
const container = document.getElementById("slideContainer");

// Add a title to the page based on the source
document.title = debugInfo.url ? 
  `Slides: ${new URL(debugInfo.url).pathname.split('/').pop()}` : 
  "Notion Slides";

// Process slide content
if (slides && slides.length > 0) {
  console.log(`Creating presentation with ${slides.length} slides`);
  console.log("Debug info:", debugInfo);
  
  // Add a title slide at the beginning
  const titleSection = document.createElement("section");
  titleSection.className = "title-slide";
  
  // Create title from URL if available
  let title = "Notion Slides";
  if (debugInfo.url) {
    try {
      const url = new URL(debugInfo.url);
      const pathParts = url.pathname.split('/');
      title = pathParts[pathParts.length - 1] || "Notion Page";
      title = title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
      console.error("Error parsing URL:", e);
    }
  }
  
  titleSection.innerHTML = `
    <h1>${title}</h1>
    <p class="subtitle">Generated from Notion</p>
    <p class="instructions">Press Space or → to advance</p>
  `;
  container.appendChild(titleSection);
  
  // Process each slide
  slides.forEach((text, index) => {
    const section = document.createElement("section");
    
    // Skip empty slides
    if (!text || !text.trim()) return;
    
    // Process the text content
    processSlideContent(section, text);
    
    container.appendChild(section);
  });
  
  // Add an ending slide
  const endingSection = document.createElement("section");
  endingSection.className = "ending-slide";
  endingSection.innerHTML = `
    <h2>Thank You</h2>
    <p>${slides.length} slides generated from Notion</p>
    <p class="created-date">${new Date().toLocaleDateString()}</p>
  `;
  container.appendChild(endingSection);
  
  // Initialize Reveal.js with some options
  Reveal.initialize({
    controls: true,
    progress: true,
    center: true,
    hash: true,
    transition: 'slide',
    // Add slide numbers
    slideNumber: true,
    // Enable keyboard navigation
    keyboard: true,
    // Show a help overlay when pressing ?
    help: true
  });
} else {
  // No slides found - show error message
  const errorSection = document.createElement("section");
  errorSection.innerHTML = `
    <h2>No slides found</h2>
    <p>Please go back to Notion and try again.</p>
    <p><a href="#" onclick="window.close()">Close this tab</a></p>
  `;
  container.appendChild(errorSection);
  
  Reveal.initialize();
  
  console.error("No slides data found in localStorage");
}

// Process the content of a slide
function processSlideContent(section, text) {
  // Check if this appears to be a heading (short text)
  if (text.length < 80 && !text.includes('\n')) {
    section.innerHTML = `<h2>${sanitizeHTML(text)}</h2>`;
    return;
  }
  
  // For longer text, format as content with heading + paragraphs
  const contentArray = text.split('\n').filter(line => line.trim());
  
  if (contentArray.length === 0) return;
  
  // First line is heading, rest is content
  const heading = document.createElement('h3');
  heading.textContent = contentArray[0];
  section.appendChild(heading);
  
  // Add remaining content as paragraphs
  if (contentArray.length > 1) {
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content';
    
    // Check if we have bullet points (lines starting with - or *)
    const hasBullets = contentArray.slice(1).some(line => 
      line.trim().startsWith('-') || line.trim().startsWith('*'));
    
    if (hasBullets) {
      // Create bullet list
      const ul = document.createElement('ul');
      
      contentArray.slice(1).forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          // This is a bullet point
          const li = document.createElement('li');
          li.textContent = trimmed.substring(1).trim();
          ul.appendChild(li);
        } else {
          // Regular paragraph before/after bullets
          const p = document.createElement('p');
          p.textContent = line;
          contentWrapper.appendChild(p);
        }
      });
      
      if (ul.childNodes.length > 0) {
        contentWrapper.appendChild(ul);
      }
    } else {
      // Regular paragraphs
      contentArray.slice(1).forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        contentWrapper.appendChild(p);
      });
    }
    
    section.appendChild(contentWrapper);
  }
}

// Basic HTML sanitization to prevent XSS
function sanitizeHTML(text) {
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
}