/**
 * Notion to Slides - Service Registry
 * 
 * Registers all services with the dependency container
 */

import { container } from './dependency_container';
import { storage } from '../models/storage';
import { source_manager } from '../models/source_manager';
import { content_processor } from '../models/content_processor';
import { configManager } from '../models/config_manager';
import { loggingService, LogLevel } from './logging_service';
import { messagingService } from './messaging_service';
import { debugService } from './debug_service';
import { content_controller } from '../controllers/content_controller';
import { authService } from './auth_service';

/**
 * Register all services with the DI container
 */
export function registerServices(): void {
  // Register core services
  container.register('storage', storage);
  container.register('source_manager', source_manager);
  container.register('content_processor', content_processor);
  container.register('config_manager', configManager);
  container.register('loggingService', loggingService);
  container.register('messagingService', messagingService);
  container.register('debugService', debugService);
  container.register('authService', authService);
  
  // Initialize loggingService (still used as a singleton through direct imports)
  loggingService.initialize({
    debugEnabled: false, // Will be updated from config later
    logLevel: LogLevel.INFO,
    prefix: '[Notion Slides]',
    maxStoredLogs: 150 // Store more logs for better troubleshooting
  });
  
  // Initialize logging with error handling capabilities
  
  // Register content_controller directly instead of the factory function
  container.register('content_controller', content_controller);
}

// Initialize services
registerServices();