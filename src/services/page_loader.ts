/**
 * Page Loader Service
 * 
 * Handles loading page templates and components
 */

import { loggingService } from './logging_service';
import { templateService } from './template_service';

type PageComponents = {
  [key: string]: string;
};

/**
 * PageLoaderService handles loading and rendering templates for views
 */
export class PageLoaderService {
  private readonly templatesPath = 'views/templates';
  private readonly componentsPath = 'views/components';
  
  /**
   * Load a page with sidebar layout
   * @param pageTitle The title of the page
   * @param components Component paths to include
   * @param variables Variables to substitute in templates
   */
  async loadSidebarPage(
    pageTitle: string,
    components: {
      sidebar?: string;
      mainContent: string[];
      additionalHead?: string;
      scripts?: string[];
    },
    variables: Record<string, string> = {}
  ): Promise<void> {
    try {
      const pageContainer = document.getElementById('page-container');
      if (!pageContainer) {
        throw new Error('Page container element not found');
      }
      
      // Show loading indicator
      pageContainer.innerHTML = this.getLoadingHTML();
      
      // Prepare components to load
      const componentPaths: Record<string, string> = {
        PAGE_TITLE: components.sidebar || `${this.componentsPath}/sidebar.html`
      };
      
      // Add sidebar component
      componentPaths.SIDEBAR = components.sidebar || `${this.componentsPath}/sidebar.html`;
      
      // Add content components
      const mainContentPromises = components.mainContent.map(path => 
        templateService.loadComponent(`${this.componentsPath}/${path}`)
      );
      
      const mainContentParts = await Promise.all(mainContentPromises);
      const mainContentHTML = mainContentParts.join('\n');
      
      // Add additional head content if provided
      let additionalHeadHTML = '';
      if (components.additionalHead) {
        additionalHeadHTML = await templateService.loadComponent(
          `${this.componentsPath}/${components.additionalHead}`
        );
      }
      
      // Add scripts if provided
      let scriptsHTML = '';
      if (components.scripts && components.scripts.length > 0) {
        scriptsHTML = components.scripts.map(script => 
          `<script src="${script}"></script>`
        ).join('\n');
      }
      
      // Create final HTML
      const finalHTML = `
        <!-- Sidebar -->
        ${await templateService.loadComponent(componentPaths.SIDEBAR)}
        
        <!-- Content area -->
        <div class="content">
          ${mainContentHTML}
        </div>
        
        ${scriptsHTML}
      `;
      
      // Update page container
      pageContainer.innerHTML = finalHTML;
      
      // Replace version placeholders
      const versionNumber = chrome.runtime.getManifest().version || '1.0.0';
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION_NO_V}}/g, versionNumber);
      document.body.innerHTML = document.body.innerHTML.replace(/{{VERSION}}/g, `v${versionNumber}`);
      
      loggingService.debug('Page loaded successfully', { pageTitle });
    } catch (error) {
      loggingService.error('Failed to load page', error);
      this.showErrorPage(error as Error);
    }
  }
  
  /**
   * Generate loading indicator HTML
   */
  private getLoadingHTML(): string {
    return `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%;">
        <p>Loading...</p>
      </div>
    `;
  }
  
  /**
   * Show error page when loading fails
   */
  private showErrorPage(error: Error): void {
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.innerHTML = `
        <div style="padding: 20px; color: #e53935;">
          <h1>Error Loading Page</h1>
          <p>There was a problem loading the page components.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

export const pageLoader = new PageLoaderService();