const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const { validateGeofence } = require('../utils/validation');

/**
 * Common validation patterns and messages
 */
const patterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  phone: /^\+?[\d\s-]{10,}$/,
  employeeId: /^EMP\d{6}$/,
  coordinates: /^-?\d+\.?\d*$/
};

const messages = {
  required: '{#label} is required',
  string: '{#label} must be a string',
  email: '{#label} must be a valid email address',
  password: '{#label} must be at least 8 characters long and contain uppercase, lowercase, number and special character',
  phone: '{#label} must be a valid phone number',
  coordinates: '{#label} must be a valid coordinate'
};

/**
 * Base schema definitions
 */
const baseSchemas = {
  email: Joi.string().email().required().messages({
    'string.email': messages.email,
    'any.required': messages.required
  }),
  password: Joi.string().pattern(patterns.password).required().messages({
    'string.pattern.base': messages.password,
    'any.required': messages.required
  }),
  name: Joi.string().required().messages({
    'any.required': messages.required
  }),
  phone: Joi.string().pattern(patterns.phone).messages({
    'string.pattern.base': messages.phone
  }),
  coordinates: {
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  },
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  },
  dateRange: {
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }
};

/**
 * Schema definitions
 */

// Auth related schemas
const registrationSchema = Joi.object({
  organization: Joi.object({
    name: baseSchemas.name,
    industry: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string().required()
    }),
    contact: Joi.object({
      email: baseSchemas.email,
      phone: baseSchemas.phone.required(),
      website: Joi.string().uri().optional()
    })
  }).required(),
  admin: Joi.object({
    email: baseSchemas.email,
    password: baseSchemas.password,
    firstName: baseSchemas.name,
    lastName: baseSchemas.name
  }).required(),
  plan: Joi.string().valid('basic', 'professional', 'enterprise').required()
});

const loginSchema = Joi.object({
  email: baseSchemas.email,
  password: Joi.string().required()
});

const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: baseSchemas.password
});

const forgotPasswordSchema = Joi.object({
  email: baseSchemas.email
});

// Geofence related schemas
const geofenceSchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array().ordered(
      baseSchemas.coordinates.longitude,
      baseSchemas.coordinates.latitude
    ).required(),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      postalCode: Joi.string()
    })
  }).required(),
  radius: Joi.number().min(50).max(10000).required(),
  type: Joi.string().valid('office', 'site', 'warehouse', 'custom'),
  schedule: Joi.object({
    enabled: Joi.boolean(),
    workDays: Joi.array().items(
      Joi.string().valid(
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday'
      )
    ),
    workHours: Joi.object({
      start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  }),
  settings: Joi.object({
    entryNotification: Joi.boolean(),
    exitNotification: Joi.boolean(),
    autoCheckIn: Joi.boolean(),
    graceperiod: Joi.number().min(0).max(60)
  })
});

// Employee related schemas
const employeeSchema = Joi.object({
  email: baseSchemas.email,
  firstName: baseSchemas.name,
  lastName: baseSchemas.name,
  personalInfo: Joi.object({
    dateOfBirth: Joi.date().iso(),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      postalCode: Joi.string()
    }),
    emergencyContact: Joi.object({
      name: Joi.string(),
      relationship: Joi.string(),
      phone: baseSchemas.phone
    })
  }),
  employmentDetails: Joi.object({
    department: Joi.string().required(),
    position: Joi.string().required(),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    workSchedule: Joi.object({
      type: Joi.string().valid('fixed', 'flexible', 'shifts'),
      hours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      workDays: Joi.array().items(
        Joi.string().valid(
          'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday', 'Sunday'
        )
      )
    })
  }).required()
});

// Subscription related schemas
const subscriptionSchema = Joi.object({
  plan: Joi.string().valid('basic', 'professional', 'enterprise').required(),
  billing: Joi.object({
    interval: Joi.string().valid('monthly', 'yearly').required(),
    paymentMethod: Joi.object({
      type: Joi.string().valid('credit_card', 'bank_transfer', 'paypal').required(),
      details: Joi.object({
        token: Joi.string().required()
      }).required()
    }).required()
  }).required()
});

// Organization related schemas
const organizationSchema = Joi.object({
  name: baseSchemas.name,
  industry: Joi.string().required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required()
  }),
  settings: Joi.object({
    timezone: Joi.string(),
    notifications: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean()
    })
  })
});

/**
 * Location check schema
 */
const locationCheckSchema = Joi.object({
  latitude: baseSchemas.coordinates.latitude,
  longitude: baseSchemas.coordinates.longitude,
  timestamp: Joi.date().iso().default(() => new Date())
});

/**
 * Leave request schema
 */
const leaveRequestSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  type: Joi.string().valid('vacation', 'sick', 'personal', 'other').required(),
  reason: Joi.string().required()
});

/**
 * Validation middleware factory
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        throw new ValidationError('Validation failed', errors);
      }

      // Replace request body with validated value
      req.body = value;
      next();
    } catch (error) {
      logger.error('Validation error:', error);
      next(error);
    }
  };
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    next(error);
  }
};

/**
 * Pre-configured validation middleware
 */
const validate = {
  // Auth validations
  registration: validateRequest(registrationSchema),
  login: validateRequest(loginSchema),
  passwordReset: validateRequest(passwordResetSchema),
  forgotPassword: validateRequest(forgotPasswordSchema),

  // Geofence validations
  geofence: validateRequest(geofenceSchema),
  locationCheck: validateRequest(locationCheckSchema),

  // Employee validations
  employee: validateRequest(employeeSchema),
  leaveRequest: validateRequest(leaveRequestSchema),

  // Subscription validations
  subscription: validateRequest(subscriptionSchema),

  // Organization validations
  organization: validateRequest(organizationSchema)
};

module.exports = {
  validate,
  validateRequest,
  sanitizeRequest,
  patterns,
  messages,
  schemas: {
    // Auth schemas
    registration: registrationSchema,
    login: loginSchema,
    passwordReset: passwordResetSchema,
    forgotPassword: forgotPasswordSchema,

    // Feature schemas
    geofence: geofenceSchema,
    employee: employeeSchema,
    subscription: subscriptionSchema,
    organization: organizationSchema,
    locationCheck: locationCheckSchema,
    leaveRequest: leaveRequestSchema,
  }
};