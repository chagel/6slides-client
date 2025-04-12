/**
 * Changelog data and loader for Notion to Slides
 * 
 * This file reads a simple text-based changelog file and populates
 * the changelog section on the about page.
 */

/**
 * Changelog entry interface
 */
interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

/**
 * Parse the changelog text file content
 * @param content The content of the changelog.txt file
 * @returns An array of ChangelogEntry objects
 */
function parseChangelogFile(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const blocks = content.split('\n\n');
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    
    const lines = block.split('\n');
    if (lines.length < 2) continue;
    
    // Parse the header (version and date)
    const headerParts = lines[0].split('|');
    if (headerParts.length !== 2) continue;
    
    const version = headerParts[0].trim();
    const date = headerParts[1].trim();
    
    // Parse the changes (bulleted list items starting with "- ")
    const changes: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ')) {
        changes.push(line.substring(2));
      }
    }
    
    entries.push({ version, date, changes });
  }
  
  return entries;
}

/**
 * Fetch the changelog file and parse it
 * @returns A promise that resolves to an array of ChangelogEntry objects
 */
async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const response = await fetch('assets/data/changelog.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch changelog: ${response.status} ${response.statusText}`);
    }
    const content = await response.text();
    return parseChangelogFile(content);
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return [];
  }
}

/**
 * Generates HTML for the changelog section
 * @param entries The changelog entries
 * @returns HTML string representing the changelog
 */
function generateChangelogHTML(entries: ChangelogEntry[]): string {
  if (entries.length === 0) {
    return '<p>No changelog entries found.</p>';
  }
  
  let html = '<div class="changelog-container">';
  
  entries.forEach(entry => {
    html += `
      <div class="changelog-entry">
        <div class="version-info">
          <span class="version-number">v${entry.version}</span>
          <span class="version-date">${entry.date}</span>
        </div>
        <ul class="changelog-items">
          ${entry.changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Initialize the changelog when the DOM is loaded
 * This function will find the changelog container and populate it with the changelog HTML
 */
function initChangelog(): void {
  // The changelog container might not be visible immediately as it's in a tab
  // Use mutation observer to watch for the container to be added to the DOM
  const checkForChangelogContainer = () => {
    const changelogContainer = document.getElementById('changelog-container');
    if (changelogContainer) {
      loadChangelog(changelogContainer);
    } else {
      // Set up a mutation observer to watch for the container
      const observer = new MutationObserver((mutations) => {
        const changelogContainer = document.getElementById('changelog-container');
        if (changelogContainer) {
          observer.disconnect();
          loadChangelog(changelogContainer);
        }
      });
      
      // Watch for changes to the body and its children
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      // Also set a timeout to check again for the container after a short delay
      // This helps in case the DOM was just loaded but the components weren't rendered yet
      setTimeout(() => {
        const changelogContainer = document.getElementById('changelog-container');
        if (changelogContainer) {
          observer.disconnect();
          loadChangelog(changelogContainer);
        }
      }, 500);
    }
  };
  
  // Function to load the changelog data and update the container
  const loadChangelog = async (container: HTMLElement) => {
    try {
      container.innerHTML = '<p>Loading changelog...</p>';
      const entries = await fetchChangelog();
      const html = generateChangelogHTML(entries);
      container.innerHTML = html;
    } catch (error) {
      console.error('Error generating changelog HTML:', error);
      container.innerHTML = '<p>Error loading changelog.</p>';
    }
  };
  
  // Start the process when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkForChangelogContainer);
  } else {
    // DOM already loaded, check for container now
    checkForChangelogContainer();
  }
}

// Initialize the changelog
initChangelog();
