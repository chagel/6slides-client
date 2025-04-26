/**
 * Six Slides - Keyboard Hints
 * 
 * Handles keyboard navigation hints for presentations
 */

import { loggingService } from '../services/logging_service';

/**
 * Keyboard hint manager
 */
export class KeyboardHints {
  /**
   * Show keyboard navigation hints
   * Display hints unless in print mode or already shown in this session
   */
  static showHints(): void {
    // Don't show in print mode or if already shown
    if (window.location.search.includes('print-pdf') || 
        sessionStorage.getItem('keyboardHintsShown')) {
      return;
    }
    
    // Create keyboard hints overlay
    const keyboardHints = document.createElement('div');
    keyboardHints.className = 'keyboard-hints';
    keyboardHints.innerHTML = `
      <div class="hints-content">
        <h3>Keyboard Controls</h3>
        <ul>
          <li><span class="key">&rightarrow;</span> or &nbsp;<span class="key">Space</span> Next slide</li>
          <li><span class="key">&leftarrow;</span> Previous slide</li>
          <li><span class="key">&downarrow;</span> Next vertical slide</li>
          <li><span class="key">&uparrow;</span> Previous vertical slide</li>
          <li><span class="key">F</span> Fullscreen</li>
          <li><span class="key">ESC</span> Overview</li>
        </ul>
        <button id="gotItBtn">Got it!</button>
      </div>
    `;
    document.body.appendChild(keyboardHints);
    
    // Add event listener to the Got It button
    document.getElementById('gotItBtn')?.addEventListener('click', () => {
      keyboardHints.classList.add('fade-out');
      setTimeout(() => {
        keyboardHints.remove();
      }, 300);
      // Remember that we've shown the hints for this session
      sessionStorage.setItem('keyboardHintsShown', 'true');
    });
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (document.body.contains(keyboardHints)) {
        keyboardHints.classList.add('fade-out');
        setTimeout(() => {
          if (document.body.contains(keyboardHints)) {
            keyboardHints.remove();
          }
        }, 300);
      }
    }, 10000);
    
    loggingService.debug('Displayed keyboard navigation hints', null, 'viewer');
  }
}
