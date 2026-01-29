/**
 * Development Logger - sends logs to Bun dev server
 * Only active when running on localhost
 */

// Check if we're in development mode (localhost)
function isDevelopment() {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * Send log to dev server for terminal output
 * @param {string} component - Component name (e.g., 'PdfGenerator', 'App')
 * @param {string} message - Log message
 * @param {Object} details - Additional details to log
 */
async function devLog(component, message, details = {}) {
  // Only log in development
  if (!isDevelopment()) {
    return;
  }

  // Also log to browser console
  console.log(`[${component}] ${message}`, details);

  // Send to server (fire-and-forget)
  try {
    fetch('/dev-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component,
        message,
        details,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Silently fail if server is not available
    });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Send error to dev server for terminal output
 * @param {string} component - Component name
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {Object} metadata - Additional metadata
 */
async function devError(component, message, error, metadata = {}) {
  // Only log in development
  if (!isDevelopment()) {
    return;
  }

  // Also log to browser console
  console.error(`[${component}] ${message}`, error, metadata);

  // Send to server (fire-and-forget)
  try {
    fetch('/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: component,
        context: component,
        message,
        name: error?.name || 'Error',
        stack: error?.stack || '',
        metadata,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Silently fail if server is not available
    });
  } catch (err) {
    // Silently fail
  }
}
