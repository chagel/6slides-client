/**
 * Notion to Slides - Authentication Service
 * 
 * Handles user authentication using chrome.identity
 */

import { loggingService } from './logging_service';
import { configManager } from '../models/config_manager';

// OAuth configuration
const CLIENT_ID = 'YOUR_CLIENT_ID'; // This would be replaced with your actual client ID
// Safely get redirect URL with fallback
const REDIRECT_URL = (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getRedirectURL) ? 
                    chrome.identity.getRedirectURL() : 
                    'https://example.com/oauth_callback';
const SCOPES = ['email', 'profile', 'openid'];

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
      loggingService.debug('Starting sign-in process');

      // In a real implementation, this would:
      // 1. Use chrome.identity.launchWebAuthFlow to authenticate
      // 2. Exchange OAuth code for tokens
      // 3. Fetch user profile information with verified subscription data
      
      // For this mock implementation, we'll create a simulated login
      const mockUserInfo: UserInfo = {
        email: 'user@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150',
        token: 'mock_token_' + Math.random().toString(36).substring(2, 15),
        subscription: {
          level: 'pro',
          expiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          signature: 'mock_signature_' + Math.random().toString(36).substring(2, 15)
        }
      };
      
      // Verify the subscription data before saving it
      if (await this.verifySubscriptionData(mockUserInfo)) {
        // Store user information and update subscription
        await this.saveUserInfo(mockUserInfo);
        await this.updateSubscriptionFromUserInfo(mockUserInfo);
        
        loggingService.debug('User signed in successfully with verified subscription', { 
          email: mockUserInfo.email,
          subscription: mockUserInfo.subscription?.level
        });
        return mockUserInfo;
      } else {
        loggingService.error('Failed to verify subscription data');
        return null;
      }
    } catch (error) {
      loggingService.error('Error during sign-in', error);
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
      // In a real implementation, this would:
      // 1. Extract the subscription data and signature
      // 2. Use crypto APIs to verify the signature against the data
      // 3. Check that the signature was created by your trusted backend
      
      // For mock implementation, we'll simulate verification
      if (!userInfo.subscription || !userInfo.subscription.signature) {
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
      
      loggingService.debug('Subscription verification result', { verified });
      return verified;
    } catch (error) {
      loggingService.error('Error verifying subscription data', error);
      return false;
    }
  }
  
  /**
   * Update local subscription data based on verified user info
   * @param userInfo User information with verified subscription
   */
  private async updateSubscriptionFromUserInfo(userInfo: UserInfo): Promise<void> {
    try {
      if (!userInfo.subscription) {
        return;
      }
      
      // Convert subscription level string to enum
      let level;
      switch (userInfo.subscription.level.toLowerCase()) {
        case 'pro':
          level = 'pro';
          break;
        case 'team':
          level = 'team';
          break;
        default:
          level = 'free';
      }
      
      // Update subscription in config manager
      await configManager.setSubscription(
        level as any, // Type cast needed since we're using string
        userInfo.subscription.expiry
      );
      
      loggingService.debug('Updated subscription from user info', { 
        level,
        expiry: userInfo.subscription.expiry 
      });
    } catch (error) {
      loggingService.error('Error updating subscription from user info', error);
    }
  }

  /**
   * Sign out the current user
   * @returns Promise resolving when sign out is complete
   */
  async signOut(): Promise<void> {
    try {
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
      
      loggingService.debug('User signed out successfully');
    } catch (error) {
      loggingService.error('Error during sign-out', error);
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
        
        // TODO: update logs
        if (!isValid) {
          console.warn('Invalid subscription data detected, resetting to free');
          // loggingService.warn('Subscription data failed validation, resetting to free');
          
          // If validation fails, reset to free
          await configManager.setSubscription('free' as any, null);
        } else {
          console.log('Subscription data validated successfully');
          // loggingService.debug('Subscription data validated successfully');
        }
      }
    } catch (error) {
      loggingService.error('Error validating subscription data', error);
    }
  }

  /**
   * Save user information to storage
   * @param userInfo User information to save
   */
  private async saveUserInfo(userInfo: UserInfo): Promise<void> {
    // Save to IndexedDB via ConfigManager
    await configManager.setValue('userEmail', userInfo.email);
    await configManager.setValue('userToken', userInfo.token);
    
    // Store subscription signature to validate later
    if (userInfo.subscription?.signature) {
      await configManager.setValue('subscriptionSignature', userInfo.subscription.signature);
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
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();
