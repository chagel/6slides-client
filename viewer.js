/**
 * Notion to Slides - Viewer
 * 
 * This script renders markdown content from Notion as slides using reveal.js.
 */

// Get slides data from localStorage
const slides = JSON.parse(localStorage.getItem("slides") || "[]");
const container = document.getElementById("slideContainer");

// Set document title
document.title = "Notion Slides";

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have slides
  if (!Array.isArray(slides) || slides.length === 0) {
    console.error("No slides data found in localStorage");
    showNoSlidesMessage();
    return;
  }
  
  console.log(`Creating presentation with ${slides.length} slides`);
  
  // Debug output - log the markdown content being rendered
  console.log("=== RENDERING MARKDOWN CONTENT ===");
  slides.forEach((slide, index) => {
    console.log(`\n--- SLIDE ${index + 1} ---\n`);
    console.log(slide);
  });
  console.log("=== END OF RENDERING CONTENT ===");
  
  // Create slides from markdown content
  slides.forEach(createMarkdownSlide);
  
  // Initialize reveal.js
  initReveal();
});

/**
 * Show message when no slides are found
 */
function showNoSlidesMessage() {
  const errorSection = document.createElement("section");
  errorSection.innerHTML = `
    <h2>No slides found</h2>
    <p>Please go back to Notion and try again.</p>
    <p>Make sure your Notion page has H1 headings to define slides.</p>
  `;
  container.appendChild(errorSection);
  
  Reveal.initialize({ controls: true });
  console.error("No slides found in localStorage");
}

/**
 * Create a slide from markdown content
 * @param {string} markdown - Markdown content for the slide
 */
function createMarkdownSlide(markdown) {
  if (!markdown || !markdown.trim()) return;
  
  const section = document.createElement("section");
  section.setAttribute("data-markdown", "");
  
  const textarea = document.createElement("textarea");
  textarea.setAttribute("data-template", "");
  textarea.textContent = markdown;
  
  section.appendChild(textarea);
  container.appendChild(section);
}

/**
 * Initialize reveal.js
 */
function initReveal() {
  // Check if markdown plugin is available
  if (typeof RevealMarkdown === 'undefined') {
    console.error("Error: RevealMarkdown plugin is not available!");
    alert("Error: Required plugin for markdown is missing. Slides may not render properly.");
    
    // Fall back to basic reveal initialization
    Reveal.initialize({
      controls: true,
      progress: true
    });
    return;
  }
  
  console.log("Initializing reveal.js with markdown plugin...");
  
  // Configure and initialize reveal.js
  Reveal.initialize({
    // Presentation features
    controls: true,
    progress: true,
    center: true,
    hash: true,
    transition: 'slide',
    
    // Display
    slideNumber: false,
    
    // Behavior
    keyboard: true,
    touch: true,
    
    // Plugins
    plugins: [ RevealMarkdown ]
  }).then(() => {
    console.log("Reveal.js initialization complete");
  });
}
