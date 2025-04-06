/**
 * Type definitions for Messaging Module
 */

/**
 * Generic message interface
 */
export interface Message {
  action: string;
  [key: string]: unknown;
}

/**
 * Message listener function type
 */
export type MessageListener = (
  message: Message, 
  sender: chrome.runtime.MessageSender
) => unknown | Promise<unknown>;

/**
 * Send a message to the content script
 * @param tabId - Tab ID to send message to
 * @param message - Message to send
 * @returns Promise resolving to the response from content script
 */
export function sendToContent(tabId: number, message: Message): Promise<unknown>;

/**
 * Send a message to the background script
 * @param message - Message to send
 * @returns Promise resolving to the response from background script
 */
export function sendToBackground(message: Message): Promise<unknown>;

/**
 * Add a message listener that returns a promise
 * @param listener - Message listener function
 * @returns Function to remove the listener
 */
export function addMessageListener(listener: MessageListener): () => void;