// Notion to Slides - Service Worker
import { messagingService } from './messaging_service';
import { authService } from './auth_service';
import { loggingService } from './logging_service';
import { configManager } from '../models/config_manager';

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
  console.log('Auth request received in worker:', request?.authAction);
  
  try {
    switch (request.authAction) {
      case 'login':
        console.log('Starting sign-in flow from worker');
        const userInfo = await authService.signIn();
        console.log('Sign-in completed:', !!userInfo);
        return { success: !!userInfo, userInfo };
        
      case 'logout':
        console.log('Processing logout request');
        await authService.signOut();
        return { success: true };
        
      case 'check':
        const isLoggedIn = await authService.isLoggedIn();
        const currentUser = await authService.getCurrentUser();
        const subscription = await configManager.getSubscription();
        
        console.log('Auth check:', { isLoggedIn, subscription: subscription?.level });
        return { 
          isLoggedIn, 
          currentUser,
          subscription
        };
        
      default:
        console.error('Unknown auth action:', request.authAction);
        return { error: 'Unknown auth action: ' + request.authAction };
    }
  } catch (error) {
    console.error('Error handling auth request:', error);
    return { error: 'Authentication error', details: String(error) };
  }
}

// Periodically validate subscription data
async function validateSubscriptionData(): Promise<void> {
  try {
    await authService.validateSubscriptionDataAtStartup();
    console.log('Subscription validation complete');
  } catch (error) {
    console.error('Error validating subscription:', error);
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
