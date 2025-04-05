/**
 * Notion to Slides - Navigation Script
 * 
 * Handles the sidebar navigation functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation handling
  const navItems = document.querySelectorAll('.nav-item');
  const pageSections = document.querySelectorAll('.page-section');
  
  // Save Settings button
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveStatus = document.getElementById('saveStatus');
  
  // Settings inputs
  const themeSelector = document.getElementById('themeSelector');
  const transitionSelector = document.getElementById('transitionSelector');
  const slideNumberSelector = document.getElementById('slideNumberSelector');
  const centerSelector = document.getElementById('centerSelector');
  
  // Load existing settings
  function loadSettings() {
    if (!themeSelector) return;
    
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
  
  // Save settings
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
    saveStatus.style.display = 'inline';
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 2000);
  }
  
  // Attach save event
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  // Load settings if we're on the settings page
  loadSettings();
  
  // Navigation functionality
  function setActivePage(pageId) {
    // Update nav items
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${pageId}`) {
        item.classList.add('active');
      }
    });
    
    // Update visible section
    pageSections.forEach(section => {
      section.classList.remove('active');
      if (section.id === pageId) {
        section.classList.add('active');
      }
    });
    
    // Update URL hash
    history.pushState(null, null, `#${pageId}`);
    
    // Save last active page
    localStorage.setItem('notionSlidesActivePage', pageId);
  }
  
  // Handle navigation clicks
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const pageId = item.getAttribute('href').substring(1);
      setActivePage(pageId);
    });
  });
  
  // Handle initial page load (from hash or localStorage)
  const hash = window.location.hash.substring(1);
  const savedPage = localStorage.getItem('notionSlidesActivePage');
  const defaultPage = 'about'; // Default page
  
  if (hash && document.getElementById(hash)) {
    setActivePage(hash);
  } else if (savedPage && document.getElementById(savedPage)) {
    setActivePage(savedPage);
  } else {
    setActivePage(defaultPage);
  }
});