const logger = require('../utils/logger');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error handling middleware:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: err.message
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: err.message
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      status: 'error',
      code: 'CONFLICT',
      message: err.message
    });
  }

  // Handle database errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'error',
        code: 'DUPLICATE_ERROR',
        message: 'Duplicate key error',
        details: err.keyValue
      });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : err.message
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Not found middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
  next(error);
};

/**
 * Request timeout middleware
 */
const timeoutHandler = (req, res, next) => {
  // Set timeout for all requests
  req.setTimeout(30000, () => {
    const error = new Error('Request timeout');
    error.statusCode = 408;
    next(error);
  });
  next();
};

/**
 * Async route handler wrapper to catch rejected promises
 */
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = require('crypto').randomBytes(16).toString('hex');

  // Log request details
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response details
  res.on('finish', () => {
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime
    });
  });

  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  timeoutHandler,
  asyncHandler,
  requestLogger
};