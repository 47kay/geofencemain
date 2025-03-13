const Joi = require('joi');

// Common validation patterns
const patterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  phone: /^\+?[\d\s-]{10,}$/,
  coordinates: /^-?\d+\.?\d*$/
};

// Common validation messages
const messages = {
  required: '{#label} is required',
  string: '{#label} must be a string',
  email: '{#label} must be a valid email address',
  password: '{#label} must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  phone: '{#label} must be a valid phone number',
  coordinates: '{#label} must be a valid coordinate'
};

// Base schemas for common fields
const baseSchemas = {
  id: Joi.string().hex().length(24),
  email: Joi.string().email().required().messages({
    'string.email': messages.email,
    'any.required': messages.required
  }),
  password: Joi.string().pattern(patterns.password).required().messages({
    'string.pattern.base': messages.password,
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

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
      return res.status(400).json({
          status: 'error',
          message: 'Both startDate and endDate are required'
      });
  }

  try {
      // Validate dates are in ISO format
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error('Invalid date format');
      }
      
      if (end < start) {
          throw new Error('End date must be after start date');
      }

      // Add validated dates to request
      req.dateRange = { startDate: start, endDate: end };
      next();
  } catch (error) {
      return res.status(400).json({
          status: 'error',
          message: `Date validation error: ${error.message}`
      });
  }
};

// Validation helper functions
const validate = (schema) => {
  return (data) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: value
    };
  };
};

const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Schema definitions
const locationCheckSchema = Joi.object({
  latitude: baseSchemas.coordinates.latitude,
  longitude: baseSchemas.coordinates.longitude
}).required();

const loginSchema = Joi.object({
  email: baseSchemas.email,
  password: baseSchemas.password
});

// Schema for registration
const registrationSchema = Joi.object({
  organization: Joi.object({
    name: Joi.string().required(),
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
      website: Joi.string().uri()
    })
  }).required(),
  admin: Joi.object({
    email: baseSchemas.email,
    password: baseSchemas.password,
    firstName: Joi.string().required(),
    lastName: Joi.string().required()
  }).required(),
  plan: Joi.string().valid('basic', 'professional', 'enterprise').required()
});

// Schema for geofence
const geofenceSchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array().items(baseSchemas.coordinates.longitude, baseSchemas.coordinates.latitude).required(),
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
    workDays: Joi.array().items(Joi.string().valid(
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    )),
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

// Schema for employee
const employeeSchema = Joi.object({
  email: baseSchemas.email,
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
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
      workDays: Joi.array().items(Joi.string().valid(
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ))
    })
  }).required()
});

// Schema for subscription
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

module.exports = {
  patterns,
  messages,
  baseSchemas,
  validateDateRange,
  validateSchema,
  validate,
  locationCheckSchema,
  registrationSchema,
  geofenceSchema,
  employeeSchema,
  subscriptionSchema,
  validateRegistration: validate(registrationSchema),
  validateLogin: validate(loginSchema),
  validateGeofence: validate(geofenceSchema),
  validateEmployee: validate(employeeSchema),
  validateSubscription: validate(subscriptionSchema)
};