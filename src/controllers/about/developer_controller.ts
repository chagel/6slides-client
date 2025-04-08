/**
 * Notion to Slides - Developer Controller
 * 
 * Handles the developer tools section of the about page
 */

import { loggingService } from '../../services/logging_service';
import { configManager, SubscriptionLevel } from '../../models/config_manager';
import { LogViewerController } from './log_viewer_controller';

/**
 * Controller for the developer tools section
 */
export class DeveloperController {
  // Testing elements
  private testSubLevel: HTMLElement | null;
  private testHasPro: HTMLElement | null;
  private testSubExpiry: HTMLElement | null;
  private setFreeBtn: HTMLElement | null;
  private setProBtn: HTMLElement | null;
  private setProExpiryBtn: HTMLElement | null;
  private setProExpiredBtn: HTMLElement | null;
  private setTeamBtn: HTMLElement | null;

  // Log viewer controller
  private logViewerController: LogViewerController;
  
  /**
   * Initialize the developer controller
   */
  constructor() {
    // Testing elements
    this.testSubLevel = document.getElementById('testSubLevel');
    this.testHasPro = document.getElementById('testHasPro');
    this.testSubExpiry = document.getElementById('testSubExpiry');
    this.setFreeBtn = document.getElementById('setFreeBtn');
    this.setProBtn = document.getElementById('setProBtn');
    this.setProExpiryBtn = document.getElementById('setProExpiryBtn');
    this.setProExpiredBtn = document.getElementById('setProExpiredBtn');
    this.setTeamBtn = document.getElementById('setTeamBtn');
    
    // Initialize log viewer with debug status
    const debugEnabled = this.isDebugEnabled();
    this.logViewerController = new LogViewerController(debugEnabled);
    
    this.bindEventHandlers();
    this.updateSubscriptionTestStatus();
  }
  
  /**
   * Check if debug mode is enabled
   */
  private isDebugEnabled(): boolean {
    const settings = configManager.getConfig();
    return settings.debugLogging === true;
  }
  
  /**
   * Get the log viewer controller
   */
  getLogViewerController(): LogViewerController {
    return this.logViewerController;
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    // Setup subscription test buttons
    if (this.setFreeBtn) {
      this.setFreeBtn.addEventListener('click', this.setFreeSubscription.bind(this));
    }
    
    if (this.setProBtn) {
      this.setProBtn.addEventListener('click', this.setProSubscription.bind(this));
    }
    
    if (this.setProExpiryBtn) {
      this.setProExpiryBtn.addEventListener('click', this.setProWithExpirySubscription.bind(this));
    }
    
    if (this.setProExpiredBtn) {
      this.setProExpiredBtn.addEventListener('click', this.setProExpiredSubscription.bind(this));
    }
    
    if (this.setTeamBtn) {
      this.setTeamBtn.addEventListener('click', this.setTeamSubscription.bind(this));
    }
  }
  
  /**
   * Update the subscription test status display
   */
  private updateSubscriptionTestStatus(): void {
    // Get subscription status directly from configManager
    const level = configManager.getSubscriptionLevel();
    const hasPro = configManager.hasPro();
    const expiry = configManager.getValue('subscriptionExpiry', null);
    
    // Format expiry date if exists
    const expiryText = expiry 
      ? new Date(expiry).toLocaleDateString() 
      : 'Never';
    
    // Update UI
    if (this.testSubLevel) this.testSubLevel.textContent = level.toUpperCase();
    if (this.testHasPro) this.testHasPro.textContent = hasPro ? 'YES ✅' : 'NO ❌';
    if (this.testSubExpiry) this.testSubExpiry.textContent = expiryText;
  }
  
  /**
   * Set free subscription
   */
  private async setFreeSubscription(): Promise<void> {
    await configManager.setSubscription(SubscriptionLevel.FREE);
    this.updateSubscriptionTestStatus();
    window.location.reload(); // Reload to see changes
  }
  
  /**
   * Set pro subscription
   */
  private async setProSubscription(): Promise<void> {
    await configManager.setSubscription(SubscriptionLevel.PRO, null);
    this.updateSubscriptionTestStatus();
    window.location.reload(); // Reload to see changes
  }
  
  /**
   * Set pro subscription with expiry
   */
  private async setProWithExpirySubscription(): Promise<void> {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiryDate = Date.now() + thirtyDaysMs;
    await configManager.setSubscription(SubscriptionLevel.PRO, expiryDate);
    this.updateSubscriptionTestStatus();
    window.location.reload(); // Reload to see changes
  }
  
  /**
   * Set pro expired subscription
   */
  private async setProExpiredSubscription(): Promise<void> {
    const yesterdayMs = -24 * 60 * 60 * 1000;
    const expiryDate = Date.now() + yesterdayMs;
    await configManager.setSubscription(SubscriptionLevel.PRO, expiryDate);
    this.updateSubscriptionTestStatus();
    window.location.reload(); // Reload to see changes
  }
  
  /**
   * Set team subscription
   */
  private async setTeamSubscription(): Promise<void> {
    await configManager.setSubscription(SubscriptionLevel.TEAM, null);
    this.updateSubscriptionTestStatus();
    window.location.reload(); // Reload to see changes
  }
}