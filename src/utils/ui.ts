/**
 * UI utility functions
 */

/**
 * Setup logo with link
 * @param targetUrl - URL to link to
 */
export function setupLogoLink(targetUrl: string): void {
  const logoContainer = document.querySelector('.logo-container');
  if (!logoContainer) return;
  
  const logoLink = document.createElement('a');
  logoLink.href = targetUrl;
  logoLink.target = '_blank';
  logoLink.rel = 'noopener noreferrer';
  
  // Move the img inside the link
  const logoImg = logoContainer.querySelector('img');
  if (logoImg) {
    logoLink.appendChild(logoImg.cloneNode(true));
    logoContainer.innerHTML = '';
    logoContainer.appendChild(logoLink);
  }
}