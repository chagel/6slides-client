/**
 * Six Slides - PDF Exporter
 * 
 * Handles PDF export functionality for presentations
 */

import { loggingService } from '../services/logging_service';
import { configManager } from './config_manager';

// Web URL from environment
const WEB_URL = process.env.WEB_URL || 'https://6slides.com';

/**
 * PDF export handler class
 */
export class PdfExporter {
  /**
   * Check if current URL is in print-pdf mode
   */
  static isPrintMode(): boolean {
    return window.location.search.includes('print-pdf');
  }
  
  /**
   * Create PDF export URL from current presentation URL
   * Handles hash/anchors properly to preserve slide position
   * @param url Current URL to convert to print mode
   * @returns URL with print-pdf parameter
   */
  static createPdfUrl(url: string): string {
    const urlObj = new URL(url);
    
    // Save any hash/anchor for slide position (like #/2/3)
    const slideHash = urlObj.hash;
    
    // Remove the hash for the redirection
    urlObj.hash = '';
    
    // Add print-pdf parameter
    if (!urlObj.searchParams.has('print-pdf')) {
      urlObj.searchParams.set('print-pdf', 'true');
    }
    
    // Get the clean URL without slide position
    return urlObj.toString();
  }
  
  /**
   * Create URL to return to presentation from print view
   * @param url Current print URL
   * @returns URL without print-pdf parameter
   */
  static createReturnUrl(url: string): string {
    const urlObj = new URL(url);
    
    // Remove print-pdf parameter
    urlObj.searchParams.delete('print-pdf');
    
    return urlObj.toString();
  }
  
  /**
   * Redirect current tab to PDF export view
   * @param tabId Chrome tab ID
   * @param url Current tab URL
   * @returns Promise resolving when tab is updated
   */
  static async redirectToPdfMode(tabId: number, url: string): Promise<void> {
    const printUrl = this.createPdfUrl(url);
    
    loggingService.debug('PDF export URL', {
      originalUrl: url,
      printUrl
    }, 'pdf_exporter');
    
    // Update the tab URL to include the print-pdf parameter
    await chrome.tabs.update(tabId, { url: printUrl });
    loggingService.info('Redirected to PDF export view', { url: printUrl }, 'pdf_exporter');
  }
  
  /**
   * Handle PDF export mode based on subscription status
   * @returns Promise resolving to true if handled, false if not in print mode
   */
  static async handlePrintMode(): Promise<boolean> {
    // Skip if not in print mode
    if (!this.isPrintMode()) {
      return false;
    }
    
    loggingService.info('Detected print-pdf in URL, checking subscription status', null, 'viewer');
    
    // Check subscription status first
    const hasPro = await configManager.hasPro();
    
    if (!hasPro) {
      await this.showProRequiredNotice();
      return true;
    }
    
    await this.showPrintModeNotice();
    return true;
  }
  
  /**
   * Show notice for non-PRO users attempting to use PDF export
   */
  private static async showProRequiredNotice(): Promise<void> {
    // User doesn't have PRO, show upgrade message
    loggingService.warn('Non-PRO user attempted to access PDF export', null, 'viewer');
    
    // Create a subscription required notice
    const proRequiredNotice = document.createElement('div');
    proRequiredNotice.className = 'print-back-notice pro-required-notice';
    proRequiredNotice.innerHTML = `
      <div class="print-notice-content">
        <h3>PRO Subscription Required</h3>
        <p>PDF export is a PRO feature. Please upgrade to access this feature.</p>
        <button id="upgradeBtn">Upgrade to PRO</button>
        <button id="backToPresentationBtn" style="margin-left: 8px; background-color: #f5f5f5; color: #333;">Back to Presentation</button>
      </div>
    `;
    document.body.appendChild(proRequiredNotice);
    
    // Add event listeners to buttons
    document.getElementById('upgradeBtn')?.addEventListener('click', () => {
      window.open(`${WEB_URL}/subscription`, '_blank');
    });
    
    document.getElementById('backToPresentationBtn')?.addEventListener('click', () => {
      // Use the utility method to create return URL
      const returnUrl = this.createReturnUrl(window.location.href);
      window.location.href = returnUrl;
    });
  }
  
  /**
   * Show notice for PRO users in print mode
   */
  private static async showPrintModeNotice(): Promise<void> {
    // User has PRO, proceed with print mode
    loggingService.info('PRO user confirmed, preparing for PDF export', null, 'viewer');
    
    // Create a "Back to Presentation" notice that won't be printed
    const backNotice = document.createElement('div');
    backNotice.className = 'print-back-notice';
    backNotice.innerHTML = `
      <div class="print-notice-content">
        <h3>Print Mode</h3>
        <p>After printing completes or if you cancel, click the button below to return to your presentation.</p>
        <button id="backToPresentationBtn">Back to Presentation</button>
      </div>
    `;
    document.body.appendChild(backNotice);
    
    // Add event listener to the back button
    document.getElementById('backToPresentationBtn')?.addEventListener('click', () => {
      // Use the utility method to create return URL
      const returnUrl = this.createReturnUrl(window.location.href);
      window.location.href = returnUrl;
    });
    
    // Wait a moment for the page to fully render for printing
    setTimeout(() => {
      window.print();
    }, 1500);
  }
}