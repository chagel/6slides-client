/**
 * Gets the extension version from manifest or package.json
 * @returns The extension version string
 */
export function getExtensionVersion(): string {
  try {
    // Try to get from Chrome runtime manifest
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome.runtime.getManifest().version;
    }
  } catch (e) {
    // Chrome API not available
  }
  
  // Fallback to hardcoded version from package.json
  // This version should be updated whenever package.json version changes
  return '1.5.1';
}