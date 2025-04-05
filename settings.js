/**
 * Notion to Slides - Settings Script
 * 
 * Handles the settings page functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
  const themeSelector = document.getElementById('themeSelector');
  const transitionSelector = document.getElementById('transitionSelector');
  const slideNumberSelector = document.getElementById('slideNumberSelector');
  const centerSelector = document.getElementById('centerSelector');
  const saveButton = document.getElementById('saveButton');
  const aboutLink = document.getElementById('aboutLink');
  
  // Load existing settings
  loadSettings();
  
  // Save settings when button is clicked
  saveButton.addEventListener('click', saveSettings);
  
  // About link functionality
  aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
  
  /**
   * Load settings from storage
   */
  function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('notionSlidesSettings') || '{}');
    
    // Set default values if settings don't exist
    const defaults = {
      theme: 'default',
      transition: 'slide',
      slideNumber: 'false',
      center: 'true'
    };
    
    // Apply settings to selectors
    themeSelector.value = settings.theme || defaults.theme;
    transitionSelector.value = settings.transition || defaults.transition;
    slideNumberSelector.value = settings.slideNumber || defaults.slideNumber;
    centerSelector.value = settings.center || defaults.center;
    
    console.log('Settings loaded:', settings);
  }
  
  /**
   * Save settings to storage
   */
  function saveSettings() {
    const settings = {
      theme: themeSelector.value,
      transition: transitionSelector.value,
      slideNumber: slideNumberSelector.value,
      center: centerSelector.value
    };
    
    localStorage.setItem('notionSlidesSettings', JSON.stringify(settings));
    console.log('Settings saved:', settings);
    
    // Show feedback
    saveButton.textContent = 'Saved!';
    saveButton.style.backgroundColor = '#27ae60';
    
    // Reset button after a short delay
    setTimeout(() => {
      saveButton.textContent = 'Save Settings';
      saveButton.style.backgroundColor = '#3F51B5';
    }, 1500);
  }
});