/**
 * Template Service
 * 
 * A service for loading and handling HTML templates dynamically
 */

import { loggingService } from './logging_service';

/**
 * TemplateService class that handles dynamically loading and processing HTML templates
 */
export class TemplateService {
  private templateCache: Record<string, string> = {};
  
  /**
   * Load a template component by its path
   * @param path Path to the component HTML file
   * @returns Promise that resolves to the HTML content
   */
  async loadComponent(path: string): Promise<string> {
    // Check if we already have it cached
    if (this.templateCache[path]) {
      return this.templateCache[path];
    }
    
    try {
      // Fetch the component
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${path} (${response.status})`);
      }
      
      const html = await response.text();
      
      // Cache the result for future use
      this.templateCache[path] = html;
      
      return html;
    } catch (error) {
      loggingService.error(`Error loading template component: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * Inject variables into a template string
   * @param template HTML template string
   * @param variables Key-value pairs of variables to inject
   * @returns Processed HTML with variables replaced
   */
  processTemplate(template: string, variables: Record<string, string> = {}): string {
    let processed = template;
    
    // Replace each variable in the template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    return processed;
  }
  
  /**
   * Combine multiple components with a base template
   * @param template Base template HTML
   * @param components Object mapping placeholders to component HTML
   * @returns Combined HTML
   */
  combineTemplates(template: string, components: Record<string, string>): string {
    let result = template;
    
    // Replace each component placeholder in the template
    for (const [placeholder, content] of Object.entries(components)) {
      const regex = new RegExp(`<!--\\s*COMPONENT:\\s*${placeholder}\\s*-->`, 'g');
      result = result.replace(regex, content);
    }
    
    return result;
  }
  
  /**
   * Load the base template and components, then combine them
   * @param baseTemplatePath Path to base template
   * @param componentPaths Object mapping placeholders to component paths
   * @param variables Variables to inject into the combined template
   * @returns Promise resolving to final HTML
   */
  async renderTemplate(
    baseTemplatePath: string, 
    componentPaths: Record<string, string>,
    variables: Record<string, string> = {}
  ): Promise<string> {
    try {
      // Load the base template
      const baseTemplate = await this.loadComponent(baseTemplatePath);
      
      // Load all components in parallel
      const componentPromises = Object.entries(componentPaths).map(async ([placeholder, path]) => {
        const content = await this.loadComponent(path);
        return { placeholder, content };
      });
      
      const loadedComponents = await Promise.all(componentPromises);
      
      // Create a components object from the loaded contents
      const components: Record<string, string> = {};
      loadedComponents.forEach(({ placeholder, content }) => {
        components[placeholder] = content;
      });
      
      // Combine templates and process variables
      let result = this.combineTemplates(baseTemplate, components);
      result = this.processTemplate(result, variables);
      
      return result;
    } catch (error) {
      loggingService.error('Error rendering template', error);
      throw error;
    }
  }
}

// Create singleton instance
export const templateService = new TemplateService();