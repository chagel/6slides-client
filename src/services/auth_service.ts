/**
 * Six Slides - Authentication Service
 * 
 * Handles user authentication using chrome.identity
 */

import { loggingService } from './logging_service';
import { configManager } from '../models/config_manager';

// Get client ID from manifest or use default
const CLIENT_ID = chrome.runtime?.getManifest()?.oauth2?.client_id || 'ai27EuZJRn6jbyot6p4gZMELrTo7_nRPPxFqQ2zTTmE';
const OAUTH_SERVER = 'http://localhost:3000';
// Safe redirect URL retrieval
const REDIRECT_URL = (chrome.identity?.getRedirectURL && chrome.identity.getRedirectURL()) || 
  (chrome.runtime?.id ? `https://${chrome.runtime.id}.chromiumapp.org/` : '');
const SCOPES = ['public', 'profile', 'subscription'];

/**
 * User authentication information
 */
export interface UserInfo {
  email: string;
  name?: string;
  picture?: string;
  token: string;
  subscription?: {
    level: string;
    expiry: number | null;
    signature: string; // Cryptographic signature to verify subscription data
  };
}

/**
 * Authentication Service
 * Handles user authentication
 */
class AuthService {
  /**
   * Check if user is currently logged in
   * @returns Promise resolving to boolean indicating login state
   */
  async isLoggedIn(): Promise<boolean> {
    const config = await configManager.getConfig();
    return !!(config.userEmail && config.userToken);
  }

  /**
   * Get current user information
   * @returns Promise resolving to user info if logged in, or null
   */
  async getCurrentUser(): Promise<UserInfo | null> {
    const config = await configManager.getConfig();
    
    if (!config.userEmail || !config.userToken) {
      return null;
    }
    
    return {
      email: config.userEmail,
      token: config.userToken
    };
  }

  /**
   * Start the sign-in process using chrome.identity
   * Securely verifies user subscription information
   * @returns Promise resolving to user info when logged in
   */
  async signIn(): Promise<UserInfo | null> {
    try {
      loggingService.debug('Starting sign-in process', {}, 'auth_service');

      // 1. Launch the auth flow to get an authorization code
      const authURL = new URL(`${OAUTH_SERVER}/oauth/authorize`);
      authURL.searchParams.append('client_id', CLIENT_ID);
      authURL.searchParams.append('redirect_uri', REDIRECT_URL);
      authURL.searchParams.append('response_type', 'code');
      authURL.searchParams.append('scope', SCOPES.join(' '));
      
      loggingService.debug('OAuth parameters', {
        server: OAUTH_SERVER,
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URL,
        scopes: SCOPES.join(' ')
      }, 'auth_service');
      
      // Generate and store a state parameter to prevent CSRF
      const state = Math.random().toString(36).substring(2, 15);
      authURL.searchParams.append('state', state);
      loggingService.debug('State parameter', { state }, 'auth_service');
      
      // Launch the web auth flow
      loggingService.debug('Launching web auth flow', {}, 'auth_service');
      const responseUrl = await this.launchAuthFlow(authURL.toString());
      
      if (!responseUrl) {
        loggingService.error('Auth flow was canceled or failed', {}, 'auth_service');
        return null;
      }
      
      loggingService.debug('Auth flow completed successfully', {}, 'auth_service');
      loggingService.debug('Response URL received', { success: !!responseUrl }, 'auth_service');
      
      // 2. Extract the authorization code from the response URL
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      
      loggingService.debug('Extracted from response', {
        code: code ? `${code.substring(0, 10)}...` : 'none',
        state: returnedState
      }, 'auth_service');
      
      // Verify state parameter to prevent CSRF attacks
      if (returnedState !== state) {
        loggingService.error('State parameter mismatch - possible CSRF attack', {
          expected: state,
          received: returnedState
        }, 'auth_service');
        return null;
      }
      
      if (!code) {
        loggingService.error('No authorization code returned', {}, 'auth_service');
        return null;
      }
      
      // 3. Exchange the code for tokens with the backend
      loggingService.debug('Exchanging authorization code for tokens', {}, 'auth_service');
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      if (!tokenResponse || !tokenResponse.access_token) {
        loggingService.error('Failed to exchange code for tokens', {
          response: tokenResponse || null
        }, 'auth_service');
        return null;
      }
      
      loggingService.debug('Received access token', {
        token: tokenResponse.access_token ? `${tokenResponse.access_token.substring(0, 10)}...` : 'none'
      }, 'auth_service');
      
      // 4. Fetch user profile with the access token
      loggingService.debug('Fetching user profile', {}, 'auth_service');
      const userInfo = await this.fetchUserProfile(tokenResponse.access_token);
      
      if (!userInfo) {
        loggingService.error('Failed to fetch user profile', {
          endpoint: `${OAUTH_SERVER}/api/v1/user`,
          tokenResponse: tokenResponse
        }, 'auth_service');
        return null;
      }
      
      loggingService.debug('User profile retrieved successfully', {
        email: userInfo.email,
        name: userInfo.name,
        subscription: userInfo.subscription?.level
      }, 'auth_service');
      
      // If user has no subscription data, they're on the free plan
      // No need to verify in this case
      if (!userInfo.subscription) {
        loggingService.debug('No subscription data found, user is on free plan', {}, 'auth_service');
        await this.saveUserInfo(userInfo);
        
        // Set default free subscription in config
        await configManager.setSubscription('free' as any, null);
        
        loggingService.debug('User signed in successfully (free plan)', { 
          email: userInfo.email
        }, 'auth_service');
        return userInfo;
      }
      
      // 5. Only verify the subscription data if it exists
      if (await this.verifySubscriptionData(userInfo)) {
        // Store user information and update subscription
        await this.saveUserInfo(userInfo);
        await this.updateSubscriptionFromUserInfo(userInfo);
        
        loggingService.debug('User signed in successfully with verified subscription', { 
          email: userInfo.email,
          subscription: userInfo.subscription.level
        }, 'auth_service');
        return userInfo;
      } else {
        loggingService.error('Failed to verify subscription data', {}, 'auth_service');
        return null;
      }
    } catch (error) {
      loggingService.error('Error during sign-in', { error }, 'auth_service');
      return null;
    }
  }
  
  /**
   * Launch the authentication flow using chrome.identity
   * @param authUrl The authorization URL
   * @returns Promise resolving to the redirect URL with auth code
   */
  private async launchAuthFlow(authUrl: string): Promise<string | null> {
    loggingService.debug('Launching auth flow', {
      redirectUrl: REDIRECT_URL
    }, 'auth_service');
    
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.launchWebAuthFlow) {
        loggingService.debug('Using chrome.identity.launchWebAuthFlow', {}, 'auth_service');
        
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              loggingService.error('Auth flow error', { error: chrome.runtime.lastError }, 'auth_service');
              resolve(null);
              return;
            }
            
            loggingService.debug('Received auth response URL', { success: !!responseUrl }, 'auth_service');
            
            resolve(responseUrl || null);
          }
        );
      } else {
        loggingService.error('Chrome identity API not available', {}, 'auth_service');
        resolve(null);
      }
    });
  }
  
  /**
   * Exchange authorization code for access/refresh tokens
   * @param code The authorization code from OAuth flow
   * @returns Promise resolving to token response
   */
  private async exchangeCodeForTokens(code: string): Promise<any> {
    try {
      const tokenEndpoint = `${OAUTH_SERVER}/oauth/token`;
      loggingService.debug('Exchanging code for tokens', {}, 'auth_service');
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          code,
          redirect_uri: REDIRECT_URL,
          grant_type: 'authorization_code'
        })
      });
      
      if (!response.ok) {
        // First, log the raw response for debugging
        const responseText = await response.text();
        
        // Try to parse it as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (_) {
          errorData = { 
            error: 'Could not parse response as JSON', 
            status: response.status,
            statusText: response.statusText,
            rawResponse: responseText
          };
        }
        
        loggingService.error('Token exchange failed', { 
          status: response.status,
          errorData
        }, 'auth_service');
        return null;
      }
      
      const tokenData = await response.json();
      loggingService.debug('Successfully exchanged code for tokens', {}, 'auth_service');
      return tokenData;
    } catch (error) {
      loggingService.error('Error exchanging code for tokens', { error }, 'auth_service');
      return null;
    }
  }
  
  /**
   * Fetch user profile information with subscription details
   * @param accessToken The access token
   * @returns Promise resolving to user information
   */
  private async fetchUserProfile(accessToken: string): Promise<UserInfo | null> {
    try {
      // Add the client_id parameter to the user endpoint URL
      const userEndpoint = `${OAUTH_SERVER}/api/v1/user?client_id=${CLIENT_ID}`;
      
      loggingService.debug('Fetching user profile', { endpoint: userEndpoint }, 'auth_service');
      
      const response = await fetch(userEndpoint.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        // First, log the raw response for debugging
        const responseText = await response.text();
        loggingService.error('User profile fetch failed', { 
          status: response.status,
          response: responseText 
        }, 'auth_service');
        return null;
      }
      
      const userData = await response.json();
      loggingService.debug('User profile fetched successfully', {
        hasSubscription: !!userData.subscription
      }, 'auth_service');
      
      // Map the backend response to our UserInfo interface
      const userInfo: UserInfo = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        token: accessToken,
        subscription: userData.subscription ? {
          level: userData.subscription.level,
          expiry: userData.subscription.expiry_date ? new Date(userData.subscription.expiry_date).getTime() : null,
          signature: userData.subscription.signature
        } : undefined
      };
      
      return userInfo;
    } catch (error) {
      loggingService.error('Error fetching user profile', { error }, 'auth_service');
      return null;
    }
  }
  
  /**
   * Verify subscription data using HMAC signature
   * @param userInfo User information including subscription data
   * @returns Promise resolving to boolean indicating if data is verified
   */
  private async verifySubscriptionData(userInfo: UserInfo): Promise<boolean> {
    try {
      loggingService.debug('Verifying subscription data', {}, 'auth_service');
      
      // 1. Check if subscription data and signature exist
      if (!userInfo.subscription || !userInfo.subscription.signature) {
        loggingService.warn('No subscription data or signature found', {}, 'auth_service');
        return false;
      }

      // 2. Format the data exactly as the server does for HMAC generation
      // Format: "EMAIL:PLAN:EXPIRY_TIMESTAMP"
      const email = userInfo.email.toUpperCase();
      const plan = userInfo.subscription.level.toUpperCase();
      // Convert to seconds if it's in milliseconds, or use null for no expiry
      const expiry = userInfo.subscription.expiry ? Math.floor(userInfo.subscription.expiry / 1000) : '';
      const dataToVerify = `${email}:${plan}:${expiry}`;
      
      // 3. Import the HMAC secret key (must match server's Rails.application.credentials.secret_key_base)
      const key = await this.getHmacKey();
      
      // 4. Calculate the HMAC using the same algorithm as the server
      const hmacHex = await this.calculateHmacSha256(dataToVerify, key);
      
      // 5. Compare our calculated HMAC with the signature from the server
      const verified = hmacHex === userInfo.subscription.signature;
      
      loggingService.debug('Subscription verification result', { verified }, 'auth_service');
      
      return verified;
    } catch (error) {
      loggingService.error('Error verifying subscription data', { error }, 'auth_service');
      return false;
    }
  }
  
  /**
   * Calculate HMAC-SHA256 for a string using the provided key
   * @param data The string to hash
   * @param key The secret key
   * @returns Hex string of the HMAC
   */
  private async calculateHmacSha256(data: string, key: string): Promise<string> {
    try {
      // 1. Encode the data and key
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const keyBuffer = encoder.encode(key);
      
      // 2. Import the key for HMAC 
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      // 3. Calculate the HMAC
      const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        dataBuffer
      );
      
      // 4. Convert to hex string to match Ruby's hexdigest output
      return this.arrayBufferToHex(signature);
    } catch (error) {
      loggingService.error('Error in calculateHmacSha256', { error }, 'auth_service');
      throw error;
    }
  }
  
  /**
   * Convert ArrayBuffer to hex string
   * @param buffer ArrayBuffer to convert
   * @returns Hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Convert an ArrayBuffer to a Base64 string
   * Uses service worker context (self)
   * @param buffer ArrayBuffer to convert
   * @returns Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    // Use btoa in service worker context
    const base64 = self.btoa(binary);
    
    // Convert standard Base64 to URL-safe Base64
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Get the HMAC key for signature verification
   * Must match Rails.application.credentials.secret_key_base on the server
   */
  private async getHmacKey(): Promise<string> {
    return '6SlIdE.CoM';
  }
  
  /**
   * Update local subscription data based on verified user info
   * @param userInfo User information with verified subscription
   */
  private async updateSubscriptionFromUserInfo(userInfo: UserInfo): Promise<void> {
    try {
      loggingService.debug('Updating subscription from user info', {}, 'auth_service');
      
      if (!userInfo.subscription) {
        loggingService.debug('No subscription data to update', {}, 'auth_service');
        return;
      }
      
      // Convert subscription level string to enum
      let level;
      switch (userInfo.subscription.level.toLowerCase()) {
        case 'pro':
          level = 'pro';
          break;
        case 'vip':
          level = 'vip';
          break;
        default:
          level = 'free';
      }
      
      // Update subscription in config manager
      await configManager.setSubscription(
        level as any, // Type cast needed since we're using string
        userInfo.subscription.expiry
      );
      
      loggingService.debug('Updated subscription', { 
        level,
        expiry: userInfo.subscription.expiry 
      }, 'auth_service');
    } catch (error) {
      loggingService.error('Error updating subscription from user info', { error }, 'auth_service');
    }
  }

  /**
   * Sign out the current user
   * @returns Promise resolving when sign out is complete
   */
  async signOut(): Promise<void> {
    try {
      loggingService.debug('Signing out user', {}, 'auth_service');
      
      // Clear user data
      await configManager.setValue('userEmail', null);
      await configManager.setValue('userToken', null);
      await configManager.setValue('subscriptionSignature', null);
      
      // Also clear from chrome.storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['userEmail', 'userToken', 'subscriptionSignature']);
      }
      
      // Reset subscription to free
      await configManager.setSubscription('free' as any, null);
      
      loggingService.debug('User signed out successfully', {}, 'auth_service');
    } catch (error) {
      loggingService.error('Error during sign-out', { error }, 'auth_service');
      throw error;
    }
  }
  
  /**
   * Validate subscription data at startup
   * This prevents tampering with stored subscription data between sessions
   * @returns Promise resolving when validation is complete
   */
  async validateSubscriptionDataAtStartup(): Promise<void> {
    try {
      loggingService.debug('Validating subscription data at startup', {}, 'auth_service');
      
      const config = await configManager.getConfig();
      const { level, expiry } = await configManager.getSubscription();
      
      // Skip validation if user is on free plan or missing required data
      if (level === 'free' || !config.userEmail || !config.subscriptionSignature) {
        loggingService.debug('Free plan or missing data, skipping validation', {}, 'auth_service');
        return;
      }
      
      // Check for expired subscription
      if (expiry && expiry < Date.now()) {
        loggingService.debug('Subscription has expired, resetting to free plan', {}, 'auth_service');
        await this.resetToFreePlan();
        return;
      }
      
      // Package the data for validation in the same format as used by the server
      // We know userEmail and userToken are not null here because we checked earlier
      const userInfo: UserInfo = {
        email: config.userEmail!,
        token: config.userToken!,
        subscription: {
          level: level,
          expiry: expiry,
          signature: config.subscriptionSignature
        }
      };
      
      // Verify the subscription data using our new method
      const isValid = await this.verifySubscriptionData(userInfo);
      
      if (!isValid) {
        loggingService.warn('Subscription data tampering detected', {
          subscriptionLevel: level,
          expiryDate: expiry ? new Date(expiry).toISOString() : null
        }, 'auth_service');
        
        // If validation fails, reset to free
        await this.resetToFreePlan();
      } else {
        loggingService.debug('Subscription data validated successfully', {}, 'auth_service');
      }
    } catch (error) {
      loggingService.error('Error validating subscription data', { error }, 'auth_service');
      // Reset to free plan on any errors
      await this.resetToFreePlan();
    }
  }
  
  /**
   * Reset user to free plan (used when validation fails)
   * @private
   */
  private async resetToFreePlan(): Promise<void> {
    await configManager.setSubscription('free' as any, null);
    await configManager.setValue('subscriptionSignature', null);
    loggingService.debug('Reset to free plan completed', {}, 'auth_service');
  }

  /**
   * Save user information to storage
   * @param userInfo User information to save
   */
  private async saveUserInfo(userInfo: UserInfo): Promise<void> {
    loggingService.debug('Saving user information', {}, 'auth_service');
    
    // Save to IndexedDB via ConfigManager
    await configManager.setValue('userEmail', userInfo.email);
    await configManager.setValue('userToken', userInfo.token);
    
    // Store subscription signature to validate later
    if (userInfo.subscription?.signature) {
      // Store the signature for later validation
      await configManager.setValue('subscriptionSignature', userInfo.subscription.signature);
      loggingService.debug('Saved subscription signature for future validation', {}, 'auth_service');
      
      // Log signature details for debugging (truncated for security)
      const truncatedSignature = userInfo.subscription.signature.substring(0, 8) + '...';
      loggingService.debug('Signature saved', { signature: truncatedSignature }, 'auth_service');
    } else {
      // Clear any existing signature if user has no subscription
      await configManager.setValue('subscriptionSignature', null);
      loggingService.debug('Cleared subscription signature (no subscription data)', {}, 'auth_service');
    }
    
    // Also save to chrome.storage for cross-context access
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data: Record<string, any> = {
        userEmail: userInfo.email,
        userToken: userInfo.token
      };
      
      // Include subscription signature if available
      if (userInfo.subscription?.signature) {
        data.subscriptionSignature = userInfo.subscription.signature;
      } else {
        // Chrome storage requires explicit removal
        await chrome.storage.local.remove(['subscriptionSignature']);
      }
      
      await chrome.storage.local.set(data);
      loggingService.debug('User info saved to chrome.storage', {}, 'auth_service');
    }
    
    loggingService.debug('User information saved successfully', {}, 'auth_service');
  }
}

// Export a singleton instance
export const authService = new AuthService();
