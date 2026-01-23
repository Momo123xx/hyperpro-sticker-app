/**
 * Centralized Error Handler
 * Captures all errors and provides logging infrastructure
 */

// Error categories
const ErrorCategory = {
  INIT_ERROR: 'INIT_ERROR',
  XLSX_ERROR: 'XLSX_ERROR',
  FETCH_ERROR: 'FETCH_ERROR',
  DOM_ERROR: 'DOM_ERROR',
  EVENT_ERROR: 'EVENT_ERROR',
  ASYNC_ERROR: 'ASYNC_ERROR',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
  CART_ERROR: 'CART_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

class ErrorHandler {
  /**
   * Log error with context
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred (e.g., 'ExcelParser.loadFile')
   * @param {Object} metadata - Additional metadata about the error
   */
  static logError(error, context, metadata = {}) {
    const errorData = this.formatError(error, context, metadata);

    // Always log to browser console
    console.error('❌ Error captured:', errorData);

    // Send to server-side stdout (if available)
    this.sendToServer(errorData);

    // Display user-friendly message
    if (metadata.showUser !== false) {
      this.showUserError(errorData.userMessage || 'An error occurred', error);
    }

    return errorData;
  }

  /**
   * Format error for logging
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Formatted error data
   */
  static formatError(error, context, metadata = {}) {
    const timestamp = new Date().toISOString();
    const category = metadata.category || ErrorCategory.RUNTIME_ERROR;

    const errorData = {
      timestamp,
      category,
      context,
      message: error.message,
      stack: error.stack,
      name: error.name,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add category-specific information
    if (category === ErrorCategory.XLSX_ERROR) {
      errorData.xlsxInfo = {
        arrayBufferSize: metadata.arrayBufferSize,
        fileUrl: metadata.fileUrl
      };
    }

    return errorData;
  }

  /**
   * Send error to server-side stdout
   * @param {Object} errorData - Formatted error data
   */
  static async sendToServer(errorData) {
    try {
      const response = await fetch('/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        console.warn('Failed to send error to server:', response.statusText);
      }
    } catch (sendError) {
      // Silently fail if server logging is not available
      console.debug('Server-side logging not available:', sendError.message);
    }
  }

  /**
   * Display user-friendly error message
   * @param {string} message - User-friendly message
   * @param {Error} error - Original error object
   */
  static showUserError(message, error) {
    // Use existing showError function if available
    if (typeof showError === 'function') {
      showError(message);
    } else {
      // Fallback: create inline error display
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText = 'background: #fee; border: 2px solid #c33; color: #c33; padding: 15px; margin: 10px; border-radius: 5px; font-weight: bold;';
      errorDiv.textContent = message;

      const main = document.querySelector('main') || document.body;
      main.prepend(errorDiv);

      // Auto-remove after 10 seconds
      setTimeout(() => errorDiv.remove(), 10000);
    }
  }

  /**
   * Initialize global error handlers
   */
  static initialize() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError(
        event.error || new Error(event.message),
        'window.onerror',
        {
          category: ErrorCategory.RUNTIME_ERROR,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          showUser: false // Don't show UI for global errors (they'll be logged)
        }
      );
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      this.logError(
        error,
        'unhandledrejection',
        {
          category: ErrorCategory.ASYNC_ERROR,
          promise: event.promise,
          userMessage: 'An unexpected error occurred. Please try again.',
          showUser: true
        }
      );

      event.preventDefault(); // Prevent default browser error handling
    });

    console.log('✅ Error handler initialized');
  }

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context name for error logging
   * @param {Object} options - Options (category, metadata, etc.)
   * @returns {Function} Wrapped function
   */
  static wrapAsync(fn, context, options = {}) {
    return async function(...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        ErrorHandler.logError(error, context, {
          category: options.category || ErrorCategory.RUNTIME_ERROR,
          ...options.metadata,
          userMessage: options.userMessage
        });

        if (options.rethrow) {
          throw error;
        }

        return options.fallbackValue;
      }
    };
  }

  /**
   * Wrap a synchronous function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context name for error logging
   * @param {Object} options - Options (category, metadata, etc.)
   * @returns {Function} Wrapped function
   */
  static wrap(fn, context, options = {}) {
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        ErrorHandler.logError(error, context, {
          category: options.category || ErrorCategory.RUNTIME_ERROR,
          ...options.metadata,
          userMessage: options.userMessage
        });

        if (options.rethrow) {
          throw error;
        }

        return options.fallbackValue;
      }
    };
  }

  /**
   * Validate DOM element exists
   * @param {string} selector - Element selector or ID
   * @param {string} context - Context for error logging
   * @returns {HTMLElement|null} Element or null if not found
   */
  static validateElement(selector, context) {
    const element = selector.startsWith('#')
      ? document.getElementById(selector.slice(1))
      : document.querySelector(selector);

    if (!element) {
      this.logError(
        new Error(`Required DOM element not found: ${selector}`),
        context,
        {
          category: ErrorCategory.DOM_ERROR,
          selector,
          userMessage: 'A required page element is missing. Please refresh the page.',
          showUser: true
        }
      );
    }

    return element;
  }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  ErrorHandler.initialize();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, ErrorCategory };
}
