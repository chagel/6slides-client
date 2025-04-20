/**
 * Six Slides - Notification Utility
 * 
 * A simple utility for displaying temporary notifications to the user
 */

/**
 * Notification type
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * Display a notification to the user
 * @param message The message to display
 * @param type The type of notification (success, error, info)
 */
export function showNotification(message: string, type: NotificationType = 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  notification.style.zIndex = '9999';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '12px';
  notification.style.fontWeight = '500';
  notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 5s forwards';
  
  // Set color based on type
  if (type === 'success') {
    notification.style.backgroundColor = '#10B981';
    notification.style.color = 'white';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#EF4444';
    notification.style.color = 'white';
  } else {
    notification.style.backgroundColor = '#3B82F6';
    notification.style.color = 'white';
  }
  
  // Add styles for animation if they don't exist
  if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add content
  notification.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
      ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' : 
       type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' :
       '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
    </svg>
    <span>${message}</span>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after animation completes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5500);
}