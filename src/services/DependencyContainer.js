/**
 * Notion to Slides - Dependency Container
 * 
 * A simple dependency injection container
 */

/**
 * DependencyContainer provides basic dependency injection functionality
 */
class DependencyContainer {
  /**
   * Constructor
   */
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }
  
  /**
   * Register a service instance
   * @param {string} name - Service name
   * @param {Object} instance - Service instance
   */
  register(name, instance) {
    this.services.set(name, instance);
  }
  
  /**
   * Register a factory function
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
  }
  
  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {Object} - The service instance
   */
  get(name) {
    // Check if service is already registered
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    // Check if factory exists
    if (this.factories.has(name)) {
      // Create service using factory
      const factory = this.factories.get(name);
      const instance = factory(this);
      
      // Register instance for future use
      this.services.set(name, instance);
      
      return instance;
    }
    
    throw new Error(`Service "${name}" not found`);
  }
}

// Export a singleton instance
export const container = new DependencyContainer();

// Export a helper function to easily get services
export function getService(name) {
  return container.get(name);
}