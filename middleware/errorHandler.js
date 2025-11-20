/**
 * Global Error Handling Middleware
 * Catches all unhandled errors and returns safe, user-friendly responses
 */

/**
 * Express error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send user-friendly error response
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? getProductionErrorMessage(statusCode)
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Get safe error message for production
 * @param {number} statusCode - HTTP status code
 * @returns {string} - User-friendly error message
 */
function getProductionErrorMessage(statusCode) {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required.';
    case 403:
      return 'Access denied.';
    case 404:
      return 'Resource not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
    default:
      return 'An error occurred. Please try again later.';
  }
}

/**
 * Handle unhandled promise rejections
 */
function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', {
      reason: reason,
      promise: promise,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to logging service
      // loggingService.logError(reason);
    }
  });
}

/**
 * Handle uncaught exceptions
 */
function setupUncaughtExceptionHandler() {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Give the server time to finish existing requests before shutting down
    console.error('Server will shut down gracefully in 10 seconds...');

    setTimeout(() => {
      process.exit(1);
    }, 10000);
  });
}

/**
 * Initialize all error handlers
 */
function initializeErrorHandlers() {
  setupUnhandledRejectionHandler();
  setupUncaughtExceptionHandler();
}

module.exports = {
  errorHandler,
  initializeErrorHandlers
};
