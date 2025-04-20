/**
 * Notion to Slides - Main UI Controller
 * 
 * Handles the main UI functionality including about, settings, and pro features
 */

import { loggingService } from '../../services/logging_service';
import { debugService } from '../../services/debug_service';
import { SettingsController } from './settings_controller';
import { DeveloperController } from './developer_controller';
import { TopNavController } from './top_nav_controller';
import { AboutContentController } from './about_content_controller';
import { getExtensionVersion } from '../../utils/version';

/**
 * AboutPageController class to coordinate all UI controllers for the about page interface
 */
class AboutPageController {
  // Sub-controllers
  private settingsController!: SettingsController;
  private developerController!: DeveloperController;
  private topNavController!: TopNavController;
  private aboutContentController!: AboutContentController;
  
  // Navigation elements
  private navLinks!: NodeListOf<Element>;
  private activeSection: string = '';
  
  /**
   * Constructor for the About Page controller
   */
  constructor() {
    // Load the page components first
    this.loadPageComponents().then(() => {
      // Initialize sub-controllers (only after components are loaded)
      this.settingsController = new SettingsController();
      this.developerController = new DeveloperController();
      this.topNavController = new TopNavController();
      this.aboutContentController = new AboutContentController();
      
      // Get navigation elements
      this.navLinks = document.querySelectorAll('.nav-item');
      
      // Bind event handlers
      this.bindEventHandlers();
      
      // Set up the tab controls in the help section
      this.setupTabNavigation();
      
      // Handle hash for initial load
      this.handleHashChange();
      
      // Debug indicator
      this.setupDebugIndicator();
    }).catch(error => {
      loggingService.error('Failed to initialize About page controller', error);
    });
  }
  
  /**
   * Load page components
   */
  private async loadPageComponents(): Promise<void> {
    try {
      const pageContainer = document.getElementById('page-container');
      if (!pageContainer) {
        throw new Error('Page container element not found');
      }
      
      // Show loading indicator
      pageContainer.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%;">
          <p>Loading...</p>
        </div>
      `;
      
      // Fetch the HTML components
      const [
        sidebar, 
        topNav,
        aboutContent, 
        settingsContent, 
        helpContent, 
        developerContent
      ] = await Promise.all([
        fetch('components/sidebar.html').then(response => response.text()),
        fetch('components/top-nav.html').then(response => response.text()),
        fetch('components/about-content.html').then(response => response.text()),
        fetch('components/settings-content.html').then(response => response.text()),
        fetch('components/help-content.html').then(response => response.text()),
        fetch('components/developer-content.html').then(response => response.text())
      ]);
      
      // Combine all parts
      const combinedHTML = `
        <!-- Sidebar -->
        ${sidebar}
        
        <!-- Top Navigation -->
        ${topNav}
        
        <!-- Content area -->
        <div class="content">
          ${aboutContent}
          ${settingsContent}
          ${helpContent}
          ${developerContent}
        </div>
      `;
      
      // Replace loading placeholder with content
      pageContainer.innerHTML = combinedHTML;
      
      // Replace version placeholders
      const versionNumber = getExtensionVersion();
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION_NO_V}}/g, versionNumber);
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION}}/g, `v${versionNumber}`);
      
      // Page components loaded successfully
    } catch (error) {
      loggingService.error('Failed to load page components', error);
      const pageContainer = document.getElementById('page-container');
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div style="padding: 20px; color: #e53935;">
            <h2>Error Loading Page</h2>
            <p>Could not load the page components. Please try again later.</p>
            <p>Error details: ${error instanceof Error ? error.message : String(error)}</p>
          </div>
        `;
      }
    }
  }
  
  /**
   * Set up the debug indicator and debug functionality
   */
  private async setupDebugIndicator(): Promise<void> {
    try {
      await debugService.setupDebugIndicator(
        {
          position: 'bottom-right',
          text: 'DEBUG MODE',
          zIndex: 9999
        },
        'about'  // Context identifier for logging
      );
    } catch (error) {
      loggingService.error('Error setting up debug indicator', { error }, 'about_controller');
    }
  }
  
  /**
   * Bind event handlers
   */
  private bindEventHandlers(): void {
    // Listen for hash changes
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    
    // Bind click events to navigation links
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = (link as HTMLAnchorElement).getAttribute('href');
        if (href) {
          window.location.hash = href;
        }
      });
    });
  }
  
  /**
   * Handle hash change to show the appropriate section
   */
  private handleHashChange(): void {
    // Get current hash without the #
    let hash = window.location.hash.substring(1);
    
    // Default to 'about' if no hash
    if (!hash) {
      hash = 'about';
      window.location.hash = '#about';
    }
    
    // Show the selected section
    this.showSection(hash);
  }
  
  /**
   * Show the specified section and hide others
   * @param sectionId - ID of the section to show
   */
  private showSection(sectionId: string): void {
    // Skip if already on this section
    if (this.activeSection === sectionId) return;
    
    // Get all page sections
    const sections = document.querySelectorAll('.page-section');
    
    // Hide all sections
    sections.forEach(section => {
      section.classList.remove('active');
      (section as HTMLElement).style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
      selectedSection.classList.add('active');
      (selectedSection as HTMLElement).style.display = 'block';
    }
    
    // Update active navigation link
    this.navLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).getAttribute('href');
      if (href === `#${sectionId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    
    // Store the active section
    this.activeSection = sectionId;
  }
  
  /**
   * Set up tab navigation for the help section tabs
   */
  private setupTabNavigation(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Get the tab ID from the data-tab attribute
        const tabId = button.getAttribute('data-tab');
        if (!tabId) return;
        
        // Update active tab button
        tabButtons.forEach(btn => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show the selected tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
          selectedTab.classList.add('active');
        }
      });
    });
  }
}

// Initialize the controller when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AboutPageController();
  });
} else {
  new AboutPageController();
}