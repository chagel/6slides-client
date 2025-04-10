/**
 * Notion to Slides - Log Viewer Controller
 * 
 * Manages the log viewer section of the developer tools page,
 * including filtering, displaying, and copying logs.
 */

import { loggingService } from '../../services/logging_service';
import { storage } from '../../models/storage';

/**
 * Controller for the log viewer section
 */
export class LogViewerController {
  // Log viewer elements
  private logViewerSection: HTMLElement | null;
  private logViewer: HTMLElement | null;
  private refreshLogsBtn: HTMLElement | null;
  private clearLogsBtn: HTMLElement | null;
  private copyLogsBtn: HTMLElement | null;
  private logLevelFilter: HTMLSelectElement | null;
  private logSearchFilter: HTMLInputElement | null;
  private logContextFilter: HTMLSelectElement | null = null;
  
  // Store current filtered logs for copy functionality
  private currentFilteredLogs: any[] = [];
  
  /**
   * Initialize the log viewer controller
   * @param visible - Whether the log viewer should be visible initially
   */
  constructor(visible: boolean = false) {
    this.logViewerSection = document.getElementById('logViewerSection');
    this.logViewer = document.getElementById('logViewer');
    this.refreshLogsBtn = document.getElementById('refreshLogsBtn');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');
    this.copyLogsBtn = document.getElementById('copyLogsBtn');
    this.logLevelFilter = document.getElementById('logLevelFilter') as HTMLSelectElement;
    this.logSearchFilter = document.getElementById('logSearchFilter') as HTMLInputElement;
    
    // Set initial visibility
    this.setVisible(visible);
    
    // Add context filter dropdown
    this.addContextFilter();
    
    // Initialize copy button state
    if (this.copyLogsBtn) {
      this.copyLogsBtn.textContent = 'Copy Logs (0)';
      (this.copyLogsBtn as HTMLButtonElement).disabled = true;
    }
    
    this.bindEventHandlers();
    this.refreshLogViewer();
  }
  
  /**
   * Set whether the log viewer is visible
   * @param visible - Whether the log viewer should be visible
   */
  setVisible(visible: boolean): void {
    if (this.logViewerSection) {
      this.logViewerSection.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * Bind event handlers to UI elements
   */
  private bindEventHandlers(): void {
    if (this.refreshLogsBtn) {
      this.refreshLogsBtn.addEventListener('click', this.refreshLogViewer.bind(this));
    }
    
    if (this.clearLogsBtn) {
      this.clearLogsBtn.addEventListener('click', this.clearLogViewer.bind(this));
    }
    
    if (this.copyLogsBtn) {
      this.copyLogsBtn.addEventListener('click', this.copyLogs.bind(this));
    }
    
    if (this.logLevelFilter) {
      this.logLevelFilter.addEventListener('change', this.filterLogViewer.bind(this));
    }
    
    if (this.logSearchFilter) {
      this.logSearchFilter.addEventListener('input', this.filterLogViewer.bind(this));
    }
  }
  
  /**
   * Add context filter dropdown to the log viewer
   */
  private addContextFilter(): void {
    // Find the filter container
    const filterContainer = document.querySelector('.log-filters');
    if (!filterContainer) return;
    
    // Check if context filter already exists
    if (document.getElementById('logContextFilter')) return;
    
    // Create context filter dropdown
    const contextFilterDiv = document.createElement('div');
    contextFilterDiv.className = 'filter-group';
    
    const contextFilterLabel = document.createElement('label');
    contextFilterLabel.htmlFor = 'logContextFilter';
    contextFilterLabel.textContent = 'Context:';
    
    const contextFilter = document.createElement('select');
    contextFilter.id = 'logContextFilter';
    contextFilter.className = 'log-filter';
    
    // Add options
    const contextOptions = [
      { value: 'all', text: 'All Contexts' },
      { value: 'viewer', text: 'Viewer' },
      { value: 'popup', text: 'Popup' },
      { value: 'settings', text: 'Settings' },
      { value: 'about', text: 'About' },
      { value: 'sidebar', text: 'Sidebar' }
    ];
    
    contextOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.text;
      contextFilter.appendChild(optionEl);
    });
    
    // Add event listener
    contextFilter.addEventListener('change', this.filterLogViewer.bind(this));
    
    // Append to filter container
    contextFilterDiv.appendChild(contextFilterLabel);
    contextFilterDiv.appendChild(contextFilter);
    filterContainer.appendChild(contextFilterDiv);
    
    // Store reference
    this.logContextFilter = contextFilter;
  }
  
  /**
   * Refresh logs from storage (async version)
   */
  async refreshLogViewer(): Promise<void> {
    if (!this.logViewer) {
      loggingService.error('Log viewer element not found', null, 'developer');
      return;
    }
    
    // Show loading indicator
    this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Loading logs...</div>';
    
    try {
      // Prepare to fetch logs from storage
      
      // Get logs from IndexedDB - increase limit to show more logs
      const logs = await storage.getDebugLogs(500);
      
      // Process logs for display
      
      // No need to print each log to console
      
      if (logs.length === 0) {
        this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs available</div>';
        return;
      }
      
      // Sort logs by timestamp (newest first)
      logs.sort((a, b) => {
        const aTime = a.timestamp || a.metadata?.timestamp || '';
        const bTime = b.timestamp || b.metadata?.timestamp || '';
        return bTime.localeCompare(aTime); // Descending order
      });
      
      // Use all logs
      this.filterAndRenderLogs(logs);
      
      // Update context filter dropdown with available contexts
      this.updateContextFilter(logs);
    } catch (error) {
      loggingService.error('Error loading logs in viewer', error, 'developer');
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Error loading logs</div>';
    }
  }
  
  /**
   * Update context filter dropdown with available contexts from logs
   */
  private updateContextFilter(logs: any[]): void {
    if (!this.logContextFilter) return;
    
    // Get unique contexts from logs
    const contexts = new Set<string>();
    
    // Always include default contexts
    contexts.add('all');
    contexts.add('about');
    contexts.add('popup');
    contexts.add('viewer');
    
    // Add contexts from logs
    logs.forEach(log => {
      if (log.metadata && log.metadata.context) {
        contexts.add(log.metadata.context);
      }
    });
    
    // Sort contexts
    const sortedContexts = [...contexts].sort();
    
    // Move 'all' to the front
    sortedContexts.sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return a.localeCompare(b);
    });
    
    // Save current selection
    const currentSelection = this.logContextFilter.value;
    
    // Clear current options
    this.logContextFilter.innerHTML = '';
    
    // Add options
    sortedContexts.forEach(context => {
      if (this.logContextFilter) {
        const option = document.createElement('option');
        option.value = context;
        option.textContent = context === 'all' ? 'All Contexts' : context.charAt(0).toUpperCase() + context.slice(1);
        this.logContextFilter.appendChild(option);
      }
    });
    
    // Restore selection if possible
    if (this.logContextFilter) {
      if (sortedContexts.includes(currentSelection)) {
        this.logContextFilter.value = currentSelection;
      } else {
        this.logContextFilter.value = 'all';
      }
    }
  }
  
  /**
   * Filter and render logs based on current filter settings
   */
  private filterAndRenderLogs(logs: any[]): void {
    if (!this.logViewer || !this.logLevelFilter || !this.logSearchFilter) return;
    
    if (logs.length === 0) {
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs available</div>';
      this.currentFilteredLogs = [];
      return;
    }
    
    // Get filter values
    const levelFilter = this.logLevelFilter.value;
    const searchFilter = this.logSearchFilter.value.toLowerCase();
    const contextFilter = (this.logContextFilter as HTMLSelectElement)?.value || 'all';
    
    // Filter logs
    const filteredLogs = logs.filter(log => {
      // Apply level filter
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchFilter && !log.message.toLowerCase().includes(searchFilter)) {
        return false;
      }
      
      // Apply context filter
      if (contextFilter !== 'all' && (!log.metadata || log.metadata.context !== contextFilter)) {
        return false;
      }
      
      return true;
    });
    
    // Store the filtered logs for copy functionality
    this.currentFilteredLogs = filteredLogs;
    
    // Display filtered logs
    this.renderLogs(filteredLogs);
    
    // Update copy button state
    if (this.copyLogsBtn) {
      this.copyLogsBtn.textContent = `Copy Logs (${filteredLogs.length})`;
      (this.copyLogsBtn as HTMLButtonElement).disabled = filteredLogs.length === 0;
    }
  }
  
  /**
   * Copy filtered logs to clipboard in a nicely formatted way
   */
  private copyLogs(): void {
    if (this.currentFilteredLogs.length === 0) {
      alert('No logs to copy');
      return;
    }
    
    // Get current filter values for header information
    const levelFilter = this.logLevelFilter?.value || 'all';
    const contextFilter = (this.logContextFilter as HTMLSelectElement)?.value || 'all';
    const searchFilter = this.logSearchFilter?.value || '';
    
    // Get browser and extension information
    const browserInfo = navigator.userAgent;
    const extensionVersion = chrome.runtime.getManifest().version;
    
    // Create header with filter information and system details
    const header = `
=== Notion Slides Debug Logs ===
Date: ${new Date().toISOString()}
Extension Version: ${extensionVersion}
Browser: ${browserInfo}

Filters: 
- Level: ${levelFilter.toUpperCase()}
- Context: ${contextFilter.toUpperCase()}
- Search: ${searchFilter ? `"${searchFilter}"` : 'None'}
Total Logs: ${this.currentFilteredLogs.length}

`;
    
    // Format each log entry
    const formattedLogs = this.currentFilteredLogs.map(log => {
      try {
        // Format timestamp with consistent format
        const timestamp = log.timestamp ? 
          new Date(log.timestamp).toISOString() : 
          new Date().toISOString();
        
        // Basic log info
        let logEntry = `[${timestamp}] [${log.level.toUpperCase()}]`;
        
        // Add context if available (with fallbacks)
        const context = log.metadata?.context || 
                       (log.context ? log.context : 'unknown');
        
        logEntry += ` [${context}]`;
        
        // Add message
        logEntry += ` ${log.message}`;
        
        // Add data if available (with better formatting and error handling)
        if (log.data) {
          try {
            const dataStr = typeof log.data === 'object' 
              ? JSON.stringify(log.data, null, 2) 
              : String(log.data);
            
            // Only add if dataStr is not empty
            if (dataStr && dataStr !== '{}' && dataStr !== 'undefined' && dataStr !== 'null') {
              logEntry += `\nData: ${dataStr}`;
            }
          } catch (error) {
            const err = error as Error;
            logEntry += `\nData: [Error formatting data: ${err.message}]`;
          }
        }
        
        // Add error details if available (with improved formatting)
        if (log.errorMessage || (log.error && typeof log.error === 'string')) {
          const errorMsg = log.errorMessage || log.error;
          logEntry += `\nError: ${errorMsg}`;
        }
        
        // Add stack trace if available (with line breaks for readability)
        if (log.stack) {
          // Format the stack trace for better readability
          const formattedStack = log.stack
            .split('\n')
            .map((line: string) => `  ${line.trim()}`)
            .join('\n');
          
          logEntry += `\nStack Trace:\n${formattedStack}`;
        }
        
        // Add log ID if available
        if (log.id) {
          logEntry += `\nID: ${log.id}`;
        }
        
        return logEntry;
      } catch (error) {
        const err = error as Error;
        // Safety fallback for any error in log formatting
        return `[Error formatting log entry: ${err.message}]\nRaw log: ${JSON.stringify(log)}`;
      }
    }).join('\n\n');
    
    // Combine header and logs
    const textToCopy = header + formattedLogs;
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Show success indicator
        if (this.copyLogsBtn) {
          const originalText = `Copy Logs (${this.currentFilteredLogs.length})`;
          const originalBg = getComputedStyle(this.copyLogsBtn).backgroundColor;
          
          // Show success state
          this.copyLogsBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
          `;
          this.copyLogsBtn.style.backgroundColor = '#4caf50';
        
          // Reset button after 2 seconds
          setTimeout(() => {
            if (this.copyLogsBtn) {
              this.copyLogsBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                ${originalText}
              `;
              this.copyLogsBtn.style.backgroundColor = originalBg;
            }
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Error copying logs to clipboard:', err);
        alert('Failed to copy logs to clipboard');
      });
  }
  
  /**
   * Filter logs based on level, search term, and context
   */
  private filterLogViewer(): void {
    // Re-filter current logs
    storage.getDebugLogs(500) // Increase limit to get more logs
      .then(logs => {
        
        this.filterAndRenderLogs(logs);
      })
      .catch(error => {
        console.error('Error retrieving logs for filtering:', error);
      });
  }
  
  /**
   * Render logs to the log viewer
   * @param logs - Logs to render
   */
  private renderLogs(logs: any[]): void {
    if (!this.logViewer) return;
    
    if (logs.length === 0) {
      this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No logs match the current filters</div>';
      return;
    }
    
    // Add log count information at the top
    const logCountInfo = document.createElement('div');
    logCountInfo.className = 'log-count-info';
    logCountInfo.innerHTML = `
      <div style="background: #f0f0f0; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 13px;">
        <strong>Displaying ${logs.length} logs</strong>
        <span style="color: #666; margin-left: 8px;">(ID format: ${logs[0].id ? 'present' : 'missing'})</span>
        <div style="margin-top: 5px; font-style: italic; color: #555;">Check browser console for total log count information</div>
      </div>
    `;
    
    // Clear log viewer
    this.logViewer.innerHTML = '';
    this.logViewer.appendChild(logCountInfo);
    
    // Render each log entry
    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      // Format timestamp - use savedAt if available, otherwise use timestamp
      const timeToUse = log.savedAt || log.timestamp;
      const timestamp = new Date(timeToUse).toLocaleTimeString();
      
      // Create log header
      const logHeader = document.createElement('div');
      logHeader.className = 'log-header';
      
      // Add level indicator
      const levelSpan = document.createElement('span');
      levelSpan.className = `log-level ${log.level}`;
      levelSpan.textContent = log.level.toUpperCase();
      logHeader.appendChild(levelSpan);
      
      // Add context indicator if available
      if (log.metadata && log.metadata.context) {
        const contextSpan = document.createElement('span');
        contextSpan.className = `log-context ${log.metadata.context}`;
        contextSpan.textContent = String(log.metadata.context);
        logHeader.appendChild(contextSpan);
      }
      
      // Add timestamp
      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-timestamp';
      timeSpan.textContent = timestamp;
      // Add tooltip with both timestamps if available
      timeSpan.title = log.savedAt ? 
        `Event time: ${log.timestamp}\nSaved time: ${log.savedAt}` : 
        `Time: ${log.timestamp}`;
      logHeader.appendChild(timeSpan);
      
      // Add message
      const messageSpan = document.createElement('span');
      messageSpan.className = 'log-message';
      messageSpan.textContent = log.message;
      logHeader.appendChild(messageSpan);
      
      // Add log ID as a tooltip to the entire header
      if (log.id) {
        logHeader.title = `Log ID: ${log.id}`;
      }
      
      logEntry.appendChild(logHeader);
      
      // Add data if available
      if (log.data) {
        const logData = document.createElement('div');
        logData.className = 'log-data';
        
        const pre = document.createElement('pre');
        pre.textContent = typeof log.data === 'object' ? 
          JSON.stringify(log.data, null, 2) : 
          String(log.data);
        
        logData.appendChild(pre);
        logEntry.appendChild(logData);
      }
      
      // Add error details if available
      if (log.errorMessage) {
        const errorData = document.createElement('div');
        errorData.className = 'log-data';
        errorData.innerHTML = `<strong>Error:</strong> ${log.errorMessage}`;
        
        if (log.stack) {
          const stackPre = document.createElement('pre');
          stackPre.textContent = log.stack;
          errorData.appendChild(stackPre);
        }
        
        logEntry.appendChild(errorData);
      }
      
      if (this.logViewer) {
        this.logViewer.appendChild(logEntry);
      }
    });
  }
  
  /**
   * Clear all logs
   */
  private clearLogViewer(): void {
    if (confirm('Are you sure you want to clear all logs?')) {
      // Clear logs
      storage.clearLogs().then(() => {
        loggingService.clearStoredLogs();
        
        // Update UI to show logs were cleared
        if (this.logViewer) {
          this.logViewer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">All logs have been cleared.</div>';
        }
        
        // Reset filtered logs array
        this.currentFilteredLogs = [];
        
        // Update copy button state
        if (this.copyLogsBtn) {
          this.copyLogsBtn.textContent = 'Copy Logs (0)';
          (this.copyLogsBtn as HTMLButtonElement).disabled = true;
        }
        
        // Create just one single log message about the clearing
        loggingService.info('Logs were cleared by user', null, 'about');
        
        // Refresh the viewer after a short delay
        setTimeout(() => {
          this.refreshLogViewer();
        }, 500);
      }).catch(error => {
        console.error('Error clearing logs:', error);
        alert('Failed to clear logs. Please try again.');
      });
    }
  }
}
