/**
 * Notion to Slides - Main UI Controller
 * 
 * Handles the main UI functionality including about, settings, and pro features
 */

import { loggingService } from '../../services/logging_service';
import { debugService } from '../../services/debug_service';
import { SettingsController } from './settings_controller';
import { SubscriptionController } from './subscription_controller';
import { DeveloperController } from './developer_controller';
import { pageLoader } from '../../services/page_loader';

/**
 * AboutPageController class to coordinate all UI controllers for the about page interface
 */
class AboutPageController {
  // Sub-controllers
  private settingsController!: SettingsController;
  private subscriptionController!: SubscriptionController;
  private developerController!: DeveloperController;
  
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
      this.subscriptionController = new SubscriptionController();
      this.developerController = new DeveloperController();
      
      // Get navigation elements
      this.navLinks = document.querySelectorAll('.nav-item');
      
      // Setup theme change handling
      this.setupThemeChangeHandler();
      
      // Initialize navigation
      this.bindNavigationEvents();
      this.handleHashChange();
      
      // Log initialization
      loggingService.debug('About page controller initialized', { controllers: ['settings', 'subscription', 'developer'] });
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
      const [sidebar, aboutContent, settingsContent, helpContent, developerContent] = await Promise.all([
        fetch('components/sidebar.html').then(response => response.text()),
        fetch('components/about-content.html').then(response => response.text()),
        fetch('components/settings-content.html').then(response => response.text()),
        fetch('components/help-content.html').then(response => response.text()),
        fetch('components/developer-content.html').then(response => response.text())
      ]);
      
      // Combine all parts
      const combinedHTML = `
        <!-- Sidebar -->
        ${sidebar}
        
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
      const versionNumber = chrome.runtime.getManifest().version || '1.0.0';
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION_NO_V}}/g, versionNumber);
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION}}/g, `v${versionNumber}`);
      
      loggingService.debug('Page components loaded successfully');
    } catch (error) {
      loggingService.error('Failed to load page components', error);
      const pageContainer = document.getElementById('page-container');
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div style="padding: 20px; color: #e53935;">
            <h1>Error Loading Page</h1>
            <p>There was a problem loading the page components.</p>
            <p>Error: ${(error as Error).message}</p>
          </div>
        `;
      }
      throw error;
    }
  }
  
  /**
   * Setup the theme change handler to connect the settings controller with subscription controller
   */
  private setupThemeChangeHandler(): void {
    // Get the theme selector element
    const themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
    
    // Early exit if theme selector doesn't exist
    if (!themeSelector) return;
    
    // Listen for changes to handle pro theme restrictions
    themeSelector.addEventListener('change', () => {
      this.subscriptionController.handleThemeChange(themeSelector);
    });
    
    // Update theme options based on subscription status
    this.subscriptionController.updateThemeOptions(themeSelector);
  }
  
  /**
   * Bind navigation events to handle tab switching
   */
  private bindNavigationEvents(): void {
    // Listen for hash changes
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    
    // Add click listeners to nav links
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
    
    // Store current section
    this.activeSection = sectionId;
    
    // Log section change
    loggingService.debug(`Navigated to section: ${sectionId}`);
  }
}

// Flag to track initialization in this about page instance
let aboutInitialized = false;

/**
 * Initialize the about page
 */
function initialize(): void {
  // Initialize when DOM is ready - use once option to prevent multiple triggers
  document.addEventListener('DOMContentLoaded', async () => {
    if (aboutInitialized) {
      console.warn('About page already initialized, preventing duplicate initialization');
      return;
    }
    
    try {
      // Set flag to prevent double initialization
      aboutInitialized = true;
      
      // Create main controller
      const aboutController = new AboutPageController();
      
      // Add a single log to indicate about page is ready
      loggingService.info('About page initialized', null, 'about');
    } catch (error) {
      loggingService.error('Error initializing about page', error);
    }
  }, { once: true });
}

// Start initialization
initialize();
