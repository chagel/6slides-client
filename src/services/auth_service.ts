/**
 * Notion to Slides - Authentication Service
 * 
 * Handles user authentication using chrome.identity
 */

import { loggingService } from './logging_service';
import { configManager } from '../models/config_manager';

// OAuth configuration
const CLIENT_ID = 'ai27EuZJRn6jbyot6p4gZMELrTo7_nRPPxFqQ2zTTmE'; 
// const OAUTH_SERVER = 'https://api.notion-slides.com'; 
const OAUTH_SERVER = 'http://localhost:3000';
// Safely get redirect URL with fallback
const REDIRECT_URL =  chrome.identity.getRedirectURL();
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
      console.log('Starting sign-in process');

      // 1. Launch the auth flow to get an authorization code
      const authURL = new URL(`${OAUTH_SERVER}/oauth/authorize`);
      authURL.searchParams.append('client_id', CLIENT_ID);
      authURL.searchParams.append('redirect_uri', REDIRECT_URL);
      authURL.searchParams.append('response_type', 'code');
      authURL.searchParams.append('scope', SCOPES.join(' '));
      
      console.log('OAuth parameters:');
      console.log('- Server:', OAUTH_SERVER);
      console.log('- Client ID:', CLIENT_ID);
      console.log('- Redirect URI:', REDIRECT_URL);
      console.log('- Scopes:', SCOPES.join(' '));
      
      // Generate and store a state parameter to prevent CSRF
      const state = Math.random().toString(36).substring(2, 15);
      authURL.searchParams.append('state', state);
      console.log('- State:', state);
      
      // Launch the web auth flow
      console.log('Launching web auth flow...');
      const responseUrl = await this.launchAuthFlow(authURL.toString());
      
      if (!responseUrl) {
        console.error('Auth flow was canceled or failed');
        return null;
      }
      
      console.log('Auth flow completed successfully');
      console.log('Response URL received:', responseUrl);
      
      // 2. Extract the authorization code from the response URL
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      
      console.log('Extracted from response:');
      console.log('- Code:', code ? `${code.substring(0, 10)}...` : 'none');
      console.log('- State:', returnedState);
      
      // Verify state parameter to prevent CSRF attacks
      if (returnedState !== state) {
        console.error('State parameter mismatch - possible CSRF attack');
        console.error('Expected:', state);
        console.error('Received:', returnedState);
        return null;
      }
      
      if (!code) {
        console.error('No authorization code returned');
        return null;
      }
      
      // 3. Exchange the code for tokens with the backend
      console.log('Exchanging authorization code for tokens...');
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      if (!tokenResponse || !tokenResponse.access_token) {
        console.error('Failed to exchange code for tokens');
        if (tokenResponse) {
          console.error('Token response did not contain access_token:', tokenResponse);
        }
        return null;
      }
      
      console.log('Received access token:', 
        tokenResponse.access_token ? `${tokenResponse.access_token.substring(0, 10)}...` : 'none');
      
      // 4. Fetch user profile with the access token
      console.log('Fetching user profile...');
      console.log('Using access token:', tokenResponse.access_token);
      const userInfo = await this.fetchUserProfile(tokenResponse.access_token);
      
      if (!userInfo) {
        console.error('Failed to fetch user profile - make sure the user API endpoint is correct');
        console.error('Check that the API is expecting the Authorization header and client_id parameter');
        console.error('Full token response:', tokenResponse);
        return null;
      }
      
      console.log('User profile retrieved successfully:', {
        email: userInfo.email,
        name: userInfo.name,
        subscription: userInfo.subscription?.level
      });
      
      // If user has no subscription data, they're on the free plan
      // No need to verify in this case
      if (!userInfo.subscription) {
        console.log('No subscription data found, user is on free plan');
        await this.saveUserInfo(userInfo);
        
        // Set default free subscription in config
        await configManager.setSubscription('free' as any, null);
        
        console.log('User signed in successfully (free plan)', { 
          email: userInfo.email
        });
        return userInfo;
      }
      
      // 5. Only verify the subscription data if it exists
      if (await this.verifySubscriptionData(userInfo)) {
        // Store user information and update subscription
        await this.saveUserInfo(userInfo);
        await this.updateSubscriptionFromUserInfo(userInfo);
        
        console.log('User signed in successfully with verified subscription', { 
          email: userInfo.email,
          subscription: userInfo.subscription.level
        });
        return userInfo;
      } else {
        console.error('Failed to verify subscription data');
        return null;
      }
    } catch (error) {
      console.error('Error during sign-in:', error);
      return null;
    }
  }
  
  /**
   * Launch the authentication flow using chrome.identity
   * @param authUrl The authorization URL
   * @returns Promise resolving to the redirect URL with auth code
   */
  private async launchAuthFlow(authUrl: string): Promise<string | null> {
    console.log('Launching auth flow with URL:', authUrl);
    console.log('Redirect URL:', REDIRECT_URL);
    
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.launchWebAuthFlow) {
        console.log('Using chrome.identity.launchWebAuthFlow');
        
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              console.error('Auth flow error:', chrome.runtime.lastError);
              resolve(null);
              return;
            }
            
            console.log('Received auth response URL:', responseUrl ? 'success' : 'no response');
            
            resolve(responseUrl || null);
          }
        );
      } else {
        console.error('Chrome identity API not available');
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
      console.log('Exchanging code for tokens');
      
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
        console.error('Raw token exchange error response:', responseText);
        
        // Try to parse it as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('Parsed token exchange error data:', errorData);
        } catch (e) {
          errorData = { 
            error: 'Could not parse response as JSON', 
            status: response.status,
            statusText: response.statusText,
            rawResponse: responseText
          };
          console.error('Error parsing token exchange response:', e);
        }
        
        console.error('Token exchange failed:', errorData);
        return null;
      }
      
      const tokenData = await response.json();
      console.log('Successfully exchanged code for tokens');
      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
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
      
      console.log('Fetching user profile from:', userEndpoint.toString());
      
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
        console.error('User profile fetch failed:', responseText);
        return null;
      }
      
      const userData = await response.json();
      console.log('User profile fetched successfully');
      
      // Log the actual user data received
      console.log('API returned user data:', userData);
      
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
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
  
  /**
   * Verify subscription data using cryptographic signature
   * @param userInfo User information including subscription data
   * @returns Promise resolving to boolean indicating if data is verified
   */
  private async verifySubscriptionData(userInfo: UserInfo): Promise<boolean> {
    try {
      console.log('Verifying subscription data');
      
      // In a real implementation, this would:
      // 1. Extract the subscription data and signature
      // 2. Use crypto APIs to verify the signature against the data
      // 3. Check that the signature was created by your trusted backend
      
      // For mock implementation, we'll simulate verification
      if (!userInfo.subscription || !userInfo.subscription.signature) {
        console.log('No subscription data or signature found');
        return false;
      }
      
      // In a real app, you would:
      // const verified = await window.crypto.subtle.verify(
      //   algorithm,
      //   publicKey,
      //   signature,
      //   data
      // );
      
      // Mock verification (always returns true for demo)
      const verified = true;
      
      console.log('Subscription verification result:', verified);
      return verified;
    } catch (error) {
      console.error('Error verifying subscription data:', error);
      return false;
    }
  }
  
  /**
   * Update local subscription data based on verified user info
   * @param userInfo User information with verified subscription
   */
  private async updateSubscriptionFromUserInfo(userInfo: UserInfo): Promise<void> {
    try {
      console.log('Updating subscription from user info');
      
      if (!userInfo.subscription) {
        console.log('No subscription data to update');
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
      
      console.log('Updated subscription:', { 
        level,
        expiry: userInfo.subscription.expiry 
      });
    } catch (error) {
      console.error('Error updating subscription from user info:', error);
    }
  }

  /**
   * Sign out the current user
   * @returns Promise resolving when sign out is complete
   */
  async signOut(): Promise<void> {
    try {
      console.log('Signing out user');
      
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
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error during sign-out:', error);
      throw error;
    }
  }
  
  /**
   * Validate subscription data at startup
   * This prevents tampering with stored subscription data
   * @returns Promise resolving when validation is complete
   */
  async validateSubscriptionDataAtStartup(): Promise<void> {
    try {
      console.log('Validating subscription data at startup');
      
      const config = await configManager.getConfig();
      const { level, expiry } = await configManager.getSubscription();
      
      // If we have a subscription signature, we need to validate the subscription
      if (config.subscriptionSignature) {
        // Package the data for validation
        const subscriptionData = {
          level,
          expiry,
          signature: config.subscriptionSignature
        };
        
        // Verify the subscription data
        const dataToVerify = {
          email: config.userEmail,
          token: config.userToken,
          subscription: subscriptionData
        };
        
        const isValid = await this.verifySubscriptionData(dataToVerify);
        
        if (!isValid) {
          console.warn('Invalid subscription data detected, resetting to free');
          
          // If validation fails, reset to free
          await configManager.setSubscription('free' as any, null);
        } else {
          console.log('Subscription data validated successfully');
        }
      } else {
        console.log('No subscription signature found, skipping validation');
      }
    } catch (error) {
      console.error('Error validating subscription data:', error);
    }
  }

  /**
   * Save user information to storage
   * @param userInfo User information to save
   */
  private async saveUserInfo(userInfo: UserInfo): Promise<void> {
    console.log('Saving user information');
    
    // Save to IndexedDB via ConfigManager
    await configManager.setValue('userEmail', userInfo.email);
    await configManager.setValue('userToken', userInfo.token);
    
    // Store subscription signature to validate later
    if (userInfo.subscription?.signature) {
      await configManager.setValue('subscriptionSignature', userInfo.subscription.signature);
      console.log('Saved subscription signature');
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
      }
      
      await chrome.storage.local.set(data);
      console.log('User info saved to chrome.storage');
    }
    
    console.log('User information saved successfully');
  }
}

// Export a singleton instance
export const authService = new AuthService();
