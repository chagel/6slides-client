// Notion to Slides - Service Worker
import { messagingService } from './messaging_service';
import { authService } from './auth_service';
import { configManager } from '../models/config_manager';
import { loggingService } from './logging_service';

// Open the viewer in a new tab
function openViewer(): Promise<{success: boolean}> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') }, () => {
      resolve({ success: true });
    });
  });
}

// Handle authentication request
async function handleAuth(request: any): Promise<any> {
  loggingService.debug('Auth request received in worker', { authAction: request?.authAction }, 'service_worker');
  
  try {
    switch (request.authAction) {
      case 'login': {
        loggingService.debug('Starting sign-in flow from worker', {}, 'service_worker');
        const userInfo = await authService.signIn();
        loggingService.debug('Sign-in completed', { success: !!userInfo }, 'service_worker');
        return { success: !!userInfo, userInfo };
      }
        
      case 'logout': {
        loggingService.debug('Processing logout request', {}, 'service_worker');
        await authService.signOut();
        return { success: true };
      }
        
      case 'check': {
        const isLoggedIn = await authService.isLoggedIn();
        const currentUser = await authService.getCurrentUser();
        const subscription = await configManager.getSubscription();
        
        loggingService.debug('Auth check', { isLoggedIn, subscription: subscription?.level }, 'service_worker');
        return { 
          isLoggedIn, 
          currentUser,
          subscription
        };
      }
        
      default: {
        loggingService.error('Unknown auth action', { authAction: request.authAction }, 'service_worker');
        return { error: 'Unknown auth action: ' + request.authAction };
      }
    }
  } catch (error) {
    loggingService.error('Error handling auth request', { error }, 'service_worker');
    return { error: 'Authentication error', details: String(error) };
  }
}

// Periodically validate subscription data
async function validateSubscriptionData(): Promise<void> {
  try {
    await authService.validateSubscriptionDataAtStartup();
    loggingService.debug('Subscription validation complete', {}, 'service_worker');
  } catch (error) {
    loggingService.error('Error validating subscription', { error }, 'service_worker');
  }
}

// Set up message handlers
messagingService.addMessageListener((message) => {
  // Handle viewer request
  if (message.action === 'open_viewer') {
    return openViewer();
  }
  
  // Handle authentication requests
  if (message.action === 'auth') {
    return handleAuth(message);
  }
  
  // Handle subscription validation request
  if (message.action === 'validate_subscription') {
    return validateSubscriptionData().then(() => ({ success: true }));
  }
  
  // Default response for unhandled messages
  return { error: 'Unhandled message action: ' + message.action };
});

// Set up service worker initialization
chrome.runtime.onInstalled.addListener(async () => {
  // Validate subscription data at startup
  await validateSubscriptionData();
  
  // Setup alarm for periodic validation (every 24 hours)
  chrome.alarms.create('subscription-validator', {
    periodInMinutes: 24 * 60 // Once a day
  });
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'subscription-validator') {
    validateSubscriptionData();
  }
});
