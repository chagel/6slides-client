/**
 * Notion to Slides - About Content Controller
 * 
 * Handles the About page content, including showing/hiding Pro CTAs based on subscription status
 */

import { loggingService } from '../../services/logging_service';
import { configManager } from '../../models/config_manager';

/**
 * AboutContentController class to manage the About section content
 */
export class AboutContentController {
  // UI Elements
  private proCTAContainer: HTMLElement | null;
  private viewSubscriptionsButton: HTMLElement | null;

  /**
   * Constructor for the About Content controller
   */
  constructor() {
    this.proCTAContainer = document.getElementById('pro-cta-container');
    this.viewSubscriptionsButton = document.getElementById('view-subscriptions-button');
    
    this.initialize();
  }
  
  /**
   * Initialize the controller
   */
  private async initialize(): Promise<void> {
    try {
      // Check subscription status and update Pro CTA visibility
      await this.updateProCTAVisibility();
      
      // Listen for auth changes to update the Pro CTA visibility
      this.listenForAuthChanges();
      
      loggingService.debug('About content controller initialized');
    } catch (error) {
      loggingService.error('Failed to initialize About content controller', error);
    }
  }
  
  /**
   * Update Pro CTA visibility based on subscription status
   */
  private async updateProCTAVisibility(): Promise<void> {
    try {
      if (!this.proCTAContainer) return;
      
      // Get current subscription status
      const hasPro = await configManager.hasPro();
      
      // Hide Pro CTA if user already has Pro
      this.proCTAContainer.style.display = hasPro ? 'none' : 'block';
      
      loggingService.debug('Updated Pro CTA visibility', { hasPro });
    } catch (error) {
      loggingService.error('Error updating Pro CTA visibility', error);
    }
  }
  
  /**
   * Listen for authentication state changes
   */
  private listenForAuthChanges(): void {
    // Set up message listener for auth events from background
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.action === 'auth_state_changed') {
        loggingService.debug('Auth state changed, updating Pro CTA visibility');
        this.updateProCTAVisibility();
      }
      return true;
    });
  }
}