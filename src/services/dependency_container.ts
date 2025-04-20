/**
 * Six Slides - Dependency Container
 * 
 * A simple dependency injection container
 */

/**
 * Service instance type
 */
export type ServiceInstance = any;

/**
 * Factory function type
 */
export type FactoryFunction = (container: DependencyContainer) => ServiceInstance;

/**
 * DependencyContainer provides basic dependency injection functionality
 */
class DependencyContainer {
  private services: Map<string, ServiceInstance>;
  private factories: Map<string, FactoryFunction>;
  
  /**
   * Constructor
   */
  constructor() {
    this.services = new Map<string, ServiceInstance>();
    this.factories = new Map<string, FactoryFunction>();
  }
  
  /**
   * Register a service instance
   * @param name - Service name
   * @param instance - Service instance
   */
  register(name: string, instance: ServiceInstance): void {
    this.services.set(name, instance);
  }
  
  /**
   * Register a factory function
   * @param name - Service name
   * @param factory - Factory function that creates the service
   */
  registerFactory(name: string, factory: FactoryFunction): void {
    this.factories.set(name, factory);
  }
  
  /**
   * Get a service by name
   * @param name - Service name
   * @returns The service instance
   */
  get<T = ServiceInstance>(name: string): T {
    // Check if service is already registered
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    
    // Check if factory exists
    if (this.factories.has(name)) {
      // Create service using factory
      const factory = this.factories.get(name)!;
      const instance = factory(this);
      
      // Register instance for future use
      this.services.set(name, instance);
      
      return instance as T;
    }
    
    throw new Error(`Service "${name}" not found`);
  }
}

// Export a singleton instance
export const container = new DependencyContainer();

// Export a helper function to easily get services
export function getService<T = ServiceInstance>(name: string): T {
  return container.get<T>(name);
}