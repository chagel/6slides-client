/**
 * Gets the extension version from environment, manifest, or fallback
 * @returns The extension version string
 */
export function getExtensionVersion(): string {
  try {
    // First check for the environment variable injected during build
    if (typeof process !== 'undefined' && process.env && process.env.EXTENSION_VERSION) {
      return process.env.EXTENSION_VERSION;
    }
    
    // If not available, try to get from Chrome runtime manifest
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome.runtime.getManifest().version;
    }
  } catch (e) {
    // Chrome API or process.env access might fail
  }
  
  // Fallback to current version in package.json
  // Only used if both environment variable and Chrome API fail
  return '1.5.1';
}
