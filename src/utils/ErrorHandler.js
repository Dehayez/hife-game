/**
 * ErrorHandler.js
 * 
 * Centralized error handling utilities.
 * Provides consistent error logging and user feedback.
 */

/**
 * Log an error with context
 * @param {Error|string} error - Error object or error message
 * @param {string} context - Context where error occurred
 * @param {Object} additionalInfo - Additional information about the error
 */
export function logError(error, context = 'Unknown', additionalInfo = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${context}] Error:`, errorMessage, additionalInfo);
  
  if (errorStack && process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', errorStack);
  }
  
  // Could add error reporting service integration here (e.g., Sentry)
  // if (window.errorReporting) {
  //   window.errorReporting.captureException(error, {
  //     tags: { context },
  //     extra: additionalInfo
  //   });
  // }
}

/**
 * Handle and log errors from async operations
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Function} fallback - Optional fallback function to call
 * @returns {*} Result of fallback function if provided
 */
export function handleAsyncError(error, context, fallback = null) {
  logError(error, context);
  
  if (fallback && typeof fallback === 'function') {
    return fallback();
  }
  
  return null;
}

/**
 * Handle storage errors gracefully
 * @param {Error} error - Error object
 * @param {string} operation - Storage operation (read/write)
 * @param {string} key - Storage key
 * @returns {*} Default value based on operation
 */
export function handleStorageError(error, operation, key) {
  logError(error, `Storage ${operation}`, { key });
  
  // Storage errors are non-critical - return safe defaults
  if (operation === 'read') {
    return null;
  }
  return false;
}

/**
 * Handle network errors with retry capability
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Function} retryFn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in milliseconds
 */
export async function handleNetworkError(error, context, retryFn, maxRetries = 3, retryDelay = 1000) {
  logError(error, context);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      return await retryFn();
    } catch (retryError) {
      logError(retryError, `${context} (retry ${attempt}/${maxRetries})`);
      
      if (attempt === maxRetries) {
        throw retryError;
      }
    }
  }
}

/**
 * Create a safe error boundary for async operations
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Context for error logging
 * @param {*} defaultValue - Default value to return on error
 * @returns {Promise<*>} Result of async function or default value
 */
export async function safeAsync(asyncFn, context, defaultValue = null) {
  try {
    return await asyncFn();
  } catch (error) {
    logError(error, context);
    return defaultValue;
  }
}

