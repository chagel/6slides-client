/**
 * Notion to Slides - Developer Controller
 * 
 * Handles the developer tools section of the about page
 */

import { loggingService } from '../../services/logging_service';
import { configManager } from '../../models/config_manager';
import { LogViewerController } from './log_viewer_controller';

/**
 * Controller for the developer tools section
 */
export class DeveloperController {
  // Log viewer controller
  private logViewerController: LogViewerController;
  
  /**
   * Initialize the developer controller
   */
  constructor() {
    // Initialize log viewer - assuming debug is enabled for developers
    this.logViewerController = new LogViewerController(true);
    
    // Additionally check for debug status asynchronously
    this.initializeDebugSettings();
  }
  
  /**
   * Initialize debug settings asynchronously
   */
  private async initializeDebugSettings(): Promise<void> {
    try {
      const settings = await configManager.getConfig();
      // Handle both boolean and string representation
      const debugEnabled = settings.debugLogging === true || 
                          (typeof settings.debugLogging === 'string' && settings.debugLogging === 'true');
      // No longer logging debug status
      
      // Make log viewer visible if debug is enabled
      // LogViewerController doesn't have setDebugEnabled, so we're using setVisible instead
      if (this.logViewerController) {
        this.logViewerController.setVisible(debugEnabled);
      }
    } catch (error) {
      console.error('Error initializing debug settings:', error);
    }
  }
  
  /**
   * Get the log viewer controller
   */
  getLogViewerController(): LogViewerController {
    return this.logViewerController;
  }
}