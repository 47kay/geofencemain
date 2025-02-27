class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class PaymentError extends AppError {
  constructor(message, details = null) {
    super(message, 402);
    this.name = 'PaymentError';
    this.details = details;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database error occurred') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class ServiceError extends AppError {
  constructor(message = 'External service error', statusCode = 503) {
    super(message, statusCode);
    this.name = 'ServiceError';
  }
}

class ConfigurationError extends AppError {
  constructor(message = 'Configuration error') {
    super(message, 500);
    this.name = 'ConfigurationError';
  }
}

// Error factory for MongoDB errors
const createMongoError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return new ConflictError(`Duplicate ${field}: ${value}`);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return new ValidationError('Validation failed', errors);
  }

  return new DatabaseError(err.message);
};

// Error factory for Stripe errors
const createStripeError = (err) => {
  switch (err.type) {
    case 'StripeCardError':
      return new PaymentError('Payment card was declined', {
        code: err.code,
        decline_code: err.decline_code
      });
    case 'StripeInvalidRequestError':
      return new ValidationError('Invalid payment request', err.message);
    case 'StripeConnectionError':
      return new ServiceError('Payment service unavailable');
    default:
      return new PaymentError('Payment processing failed');
  }
};

// Error factory for JWT errors
const createJWTError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token has expired');
  }
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  return new UnauthorizedError('Authentication failed');
};

// Helper to determine if error is trusted operational error
const isOperationalError = (err) => {
  if (err instanceof AppError) {
    return err.isOperational;
  }
  return false;
};

// Helper to format error for response
const formatError = (err) => {
  return {
    status: err.status || 'error',
    code: err.name,
    message: err.message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
};

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentError,
  RateLimitError,
  DatabaseError,
  ServiceError,
  ConfigurationError,
  createMongoError,
  createStripeError,
  createJWTError,
  isOperationalError,
  formatError
};