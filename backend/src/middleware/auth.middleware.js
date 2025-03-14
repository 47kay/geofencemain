const jwt = require('jsonwebtoken');
// const config = require('../config/auth');
const config = require('../config/env');
const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('No authorization token provided');
    }

    // Extract token from Bearer schema
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`Invalid token: ${error.message}`);
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      logger.error(`Authentication error: ${error.message}`);
      next(error);
    }
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const { role } = req.user;
      if (!allowedRoles.includes(role)) {
        throw new ForbiddenError('Insufficient permissions');
      }
      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Combined role-based and self-access authorization middleware
 */
const authorizeOrSelf = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const { role, userId } = req.user;
      const requestedUserId = req.params.id;

      // Allow access if user has appropriate role or is accessing their own resource
      if (allowedRoles.includes(role) || userId === requestedUserId) {
        next();
      } else {
        throw new ForbiddenError('Insufficient permissions');
      }
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Self-access only authorization middleware
 */
const authorizeSelf = () => {
  return (req, res, next) => {
    try {
      const { userId } = req.user;
      const requestedUserId = req.params.id;

      if (userId !== requestedUserId) {
        throw new ForbiddenError('Can only access own resources');
      }
      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Organization access middleware
 */
const verifyOrganizationAccess = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const requestedOrgId = req.params.organizationId || req.body.organizationId;

    if (requestedOrgId && organizationId !== requestedOrgId) {
      throw new ForbiddenError('Access denied to requested organization');
    }
    next();
  } catch (error) {
    logger.error(`Organization access error: ${error.message}`);
    next(error);
  }
};

/**
 * Subscription validation middleware
 */
const validateSubscription = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const subscription = await getSubscriptionStatus(organizationId);

    if (!subscription.active) {
      throw new ForbiddenError('Active subscription required');
    }

    // Check feature access based on subscription plan
    if (req.path.includes('/api/geofence') && !subscription.features.includes('geofencing')) {
      throw new ForbiddenError('Feature not available in current subscription plan');
    }

    next();
  } catch (error) {
    logger.error(`Subscription validation error: ${error.message}`);
    next(error);
  }
};

/**
 * Rate limiting middleware
 */
const rateLimit = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const key = `${organizationId}:${req.path}`;
    
    // Check rate limit based on subscription tier
    const subscription = await getSubscriptionStatus(organizationId);
    const limit = subscription.rateLimit || 100; // Default rate limit
    
    const currentUsage = await getRateLimitUsage(key);
    if (currentUsage >= limit) {
      throw new ForbiddenError('Rate limit exceeded');
    }
    
    await incrementRateLimitUsage(key);
    next();
  } catch (error) {
    logger.error(`Rate limit error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeOrSelf,
  authorizeSelf,
  verifyOrganizationAccess,
  validateSubscription,
  rateLimit
};