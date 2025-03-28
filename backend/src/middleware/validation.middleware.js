
//home/temitope/Desktop/work/geofencemain/backend/src/middleware/validation.middleware.js

const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
// const { validateGeofence } = require('../utils/validation');


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


// 2FA schemas
const verify2FASchema = Joi.object({
  code: Joi.string().required().length(6).pattern(/^\d+$/).messages({
    'string.empty': 'Verification code is required',
    'string.length': 'Verification code must be 6 digits',
    'string.pattern.base': 'Verification code must contain only digits'
  })
});

const disable2FASchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

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

// const loginSchema = Joi.object({
//   email: baseSchemas.email,
//   password: Joi.string().required()
// });
const loginSchema = Joi.object({
  email: baseSchemas.email,
  password: baseSchemas.password 
});


const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'string.empty': 'Refresh token is required',
    'any.required': 'Refresh token is required'
  })
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

      req.body = value;
      next();
    } catch (error) {
      logger.error('Validation error:', error);
      next(error);
    }
  };
};


const verifyEmailCodeSchema = Joi.object({
  email: baseSchemas.email,
  code: Joi.string().required().length(4).pattern(/^\d+$/).messages({
    'string.empty': 'Verification code is required',
    'string.length': 'Verification code must be 4 digits',
    'string.pattern.base': 'Verification code must contain only digits'
  })
});

// Add to your validation object
// validate.verifyEmailCode = validateRequest(verifyEmailCodeSchema);


/**
 * Request sanitization middleware
 */

const sanitizeRequest = (req, res, next) => {
  try {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
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

const resendVerificationSchema = Joi.object({
  email: baseSchemas.email
});

const departmentSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().max(500),
  parentDepartmentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null),
  managerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null)
});

// Invitation validation schemas
const inviteUserSchema = Joi.object({
  email: baseSchemas.email,
  role: Joi.string().valid('admin', 'manager', 'user').required(),
  departmentId: Joi.string().optional(),
  additionalData: Joi.object().optional()
});

const completeRegistrationSchema = Joi.object({
  token: Joi.string().required(),
  firstName: baseSchemas.name,
  lastName: baseSchemas.name,
  password: baseSchemas.password,
  phone: Joi.string().optional()
});

// Schema for assigning admin to branch
const assignBranchAdminSchema = Joi.object({
  userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).description('ID of existing user to assign'),
  email: Joi.string().email().description('Email of user to assign or create'),
  firstName: Joi.string().when('email', {
    is: Joi.exist(),
    then: Joi.when('userId', {
      not: Joi.exist(),
      then: Joi.required()
    })
  }),
  lastName: Joi.string().when('email', {
    is: Joi.exist(),
    then: Joi.when('userId', {
      not: Joi.exist(),
      then: Joi.required()
    })
  })
})
    .or('userId', 'email'); // Ensure that either userId or email is provided



/**
 * Pre-configured validation middleware
 */
const validate = {

  assignBranchAdmin: validateRequest(assignBranchAdminSchema),

  verify2FA: validateRequest(verify2FASchema),
  disable2FA: validateRequest(disable2FASchema),

  verifyEmailCode: validateRequest(verifyEmailCodeSchema),
  resendVerification: validateRequest(resendVerificationSchema),
  inviteUser: validateRequest(inviteUserSchema),
  completeRegistration: validateRequest(completeRegistrationSchema),
  department: validateRequest(departmentSchema),


  
  // Auth validations
  registration: validateRequest(registrationSchema),
  login: validateRequest(loginSchema),
  passwordReset: validateRequest(passwordResetSchema),
  forgotPassword: validateRequest(forgotPasswordSchema),
  refreshToken: validateRequest(refreshTokenSchema),

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
    assignBranchAdmin: assignBranchAdminSchema,

    // Feature schemas
    geofence: geofenceSchema,
    employee: employeeSchema,
    subscription: subscriptionSchema,
    organization: organizationSchema,
    locationCheck: locationCheckSchema,
    leaveRequest: leaveRequestSchema,
    department: departmentSchema,
  }
};