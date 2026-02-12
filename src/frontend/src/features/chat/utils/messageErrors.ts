/**
 * Extract a specific, user-friendly error message from backend/network errors
 */
export function extractErrorMessage(error: unknown): string {
  // Handle Error objects
  if (error instanceof Error) {
    // Check for common backend error patterns
    const message = error.message;
    
    // Room-related errors
    if (message.includes('Room does not exist')) {
      return 'This room no longer exists.';
    }
    if (message.includes('Room has no messages')) {
      return 'Unable to access room messages.';
    }
    
    // Permission errors
    if (message.includes('only edit your own')) {
      return 'You can only edit your own messages.';
    }
    if (message.includes('only delete your own')) {
      return 'You can only delete your own messages.';
    }
    
    // Message not found
    if (message.includes('Message not found')) {
      return 'This message no longer exists.';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    
    // Actor initialization
    if (message.includes('Actor not initialized')) {
      return 'Connection lost. Please refresh the page.';
    }
    
    // Return the original message if it's reasonably short and clear
    if (message.length < 100 && !message.includes('undefined')) {
      return message;
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'Failed to send message. Please try again.';
}
