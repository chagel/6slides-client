/**
 * Notion to Slides - Messaging Service
 * 
 * Handles communication between extension components
 */

/**
 * Message interface
 */
export interface Message {
  action: string;
  [key: string]: any;
}

/**
 * Message listener type
 */
export type MessageListener = (
  message: Message, 
  sender: chrome.runtime.MessageSender
) => unknown | Promise<unknown>;

/**
 * MessagingService provides communication capabilities between different extension components
 */
class MessagingService {
  /**
   * Send a message to the content script
   * @param tabId - Tab ID to send message to
   * @param message - Message to send
   * @returns Response from content script
   */
  sendToContent(tabId: number, message: Message): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to content script', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          
          resolve(response);
        });
        
        // Set a timeout to reject the promise if no response is received
        setTimeout(() => {
          reject(new Error('Message timeout: No response from content script'));
        }, 10000); // 10 seconds timeout
      } catch (error) {
        console.error('Failed to send message to content script', error);
        reject(error);
      }
    });
  }

  /**
   * Send a message to the background script
   * @param message - Message to send
   * @returns Response from background script
   */
  sendToBackground(message: Message): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to background script', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          
          resolve(response);
        });
        
        // Set a timeout to reject the promise if no response is received
        setTimeout(() => {
          reject(new Error('Message timeout: No response from background script'));
        }, 5000); // 5 seconds timeout
      } catch (error) {
        console.error('Failed to send message to background script', error);
        reject(error);
      }
    });
  }

  /**
   * Add a message listener that returns a promise
   * @param listener - Message listener function
   * @returns Function to remove the listener
   */
  addMessageListener(listener: MessageListener): () => void {
    const wrappedListener = (
      message: Message, 
      sender: chrome.runtime.MessageSender, 
      sendResponse: (response?: any) => void
    ) => {
      try {
        // Call the listener and handle both promises and direct returns
        const result = listener(message, sender);
        
        if (result instanceof Promise) {
          // For async listeners, keep the message channel open
          result
            .then(sendResponse)
            .catch(error => {
              console.error('Error in async message listener', error);
              sendResponse({ error: (error as Error).message });
            });
          
          return true; // Keep the message channel open
        } else {
          // For synchronous listeners, send the response immediately
          sendResponse(result);
          return false;
        }
      } catch (error) {
        console.error('Error in message listener', error);
        sendResponse({ error: (error as Error).message });
        return false;
      }
    };
    
    chrome.runtime.onMessage.addListener(wrappedListener);
    
    // Return a function to remove the listener
    return () => {
      chrome.runtime.onMessage.removeListener(wrappedListener);
    };
  }
}

// Export singleton instance
export const messagingService = new MessagingService();