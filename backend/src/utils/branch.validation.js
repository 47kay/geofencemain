//home/temitope/Desktop/work/geofencemain/backend/src/utils/branch.validation.js

const Joi = require('joi');

// Import validation patterns or define them here
const patterns = {
    phone: /^\+?[\d\s-]{10,}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    coordinates: /^-?\d+\.?\d*$/,
    mongoId: /^[0-9a-fA-F]{24}$/
};

// Branch creation schema
const branchSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Branch name is required',
            'string.min': 'Branch name must be at least 2 characters',
            'string.max': 'Branch name cannot exceed 100 characters',
            'any.required': 'Branch name is required'
        }),

    address: Joi.object({
        street: Joi.string().required().trim().messages({
            'string.empty': 'Street address is required',
            'any.required': 'Street address is required'
        }),
        city: Joi.string().required().trim().messages({
            'string.empty': 'City is required',
            'any.required': 'City is required'
        }),
        state: Joi.string().required().trim().messages({
            'string.empty': 'State/Province is required',
            'any.required': 'State/Province is required'
        }),
        country: Joi.string().required().trim().messages({
            'string.empty': 'Country is required',
            'any.required': 'Country is required'
        }),
        postalCode: Joi.string().required().trim().messages({
            'string.empty': 'Postal/Zip code is required',
            'any.required': 'Postal/Zip code is required'
        })
    }).required().messages({
        'any.required': 'Branch address is required'
    }),

    contact: Joi.object({
        email: Joi.string().email().trim().messages({
            'string.email': 'Please provide a valid email address'
        }),
        phone: Joi.string().pattern(patterns.phone).messages({
            'string.pattern.base': 'Please provide a valid phone number'
        })
    }),

    // Branch administrator
    branchAdminId: Joi.string().regex(patterns.mongoId).messages({
        'string.pattern.base': 'Invalid branch admin ID format'
    }),

    branchAdminEmail: Joi.string().email().trim().messages({
        'string.email': 'Please provide a valid email address for branch admin'
    }),

    branchAdminFirstName: Joi.string().when('branchAdminEmail', {
        is: Joi.exist(),
        then: Joi.string().required().trim().messages({
            'string.empty': 'Branch admin first name is required when creating a new admin',
            'any.required': 'Branch admin first name is required when creating a new admin'
        }),
        otherwise: Joi.string().optional()
    }),

    branchAdminLastName: Joi.string().when('branchAdminEmail', {
        is: Joi.exist(),
        then: Joi.string().required().trim().messages({
            'string.empty': 'Branch admin last name is required when creating a new admin',
            'any.required': 'Branch admin last name is required when creating a new admin'
        }),
        otherwise: Joi.string().optional()
    }),

    // Optional fields
    uniqueCode: Joi.string().trim(),
    status: Joi.string().valid('active', 'inactive').default('active')
}).custom((obj, helper) => {
    // Custom validation to ensure either branchAdminId or branchAdminEmail+names are provided
    if (obj.branchAdminId && obj.branchAdminEmail) {
        return helper.message('Provide either branch admin ID or email, not both');
    }

    // If branchAdminEmail is provided, ensure first and last names are also provided
    if (obj.branchAdminEmail && (!obj.branchAdminFirstName || !obj.branchAdminLastName)) {
        return helper.message('When providing branch admin email, first and last name are required');
    }

    return obj;
});

// Branch update schema (similar to creation but all fields optional)
const branchUpdateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .messages({
            'string.min': 'Branch name must be at least 2 characters',
            'string.max': 'Branch name cannot exceed 100 characters'
        }),

    address: Joi.object({
        street: Joi.string().trim(),
        city: Joi.string().trim(),
        state: Joi.string().trim(),
        country: Joi.string().trim(),
        postalCode: Joi.string().trim()
    }),

    contact: Joi.object({
        email: Joi.string().email().trim().messages({
            'string.email': 'Please provide a valid email address'
        }),
        phone: Joi.string().pattern(patterns.phone).messages({
            'string.pattern.base': 'Please provide a valid phone number'
        })
    }),

    // Branch administrator
    branchAdminId: Joi.string().regex(patterns.mongoId).messages({
        'string.pattern.base': 'Invalid branch admin ID format'
    }),

    branchAdminEmail: Joi.string().email().trim().messages({
        'string.email': 'Please provide a valid email address for branch admin'
    }),

    branchAdminFirstName: Joi.string(),
    branchAdminLastName: Joi.string(),

    // Optional fields
    uniqueCode: Joi.string().trim(),
    status: Joi.string().valid('active', 'inactive')
}).custom((obj, helper) => {
    // Custom validation to ensure either branchAdminId or branchAdminEmail+names are provided
    if (obj.branchAdminId && obj.branchAdminEmail) {
        return helper.message('Provide either branch admin ID or email, not both');
    }

    // If branchAdminEmail is provided, ensure first and last names are also provided
    if (obj.branchAdminEmail && (!obj.branchAdminFirstName || !obj.branchAdminLastName)) {
        return helper.message('When providing branch admin email, first and last name are required');
    }

    return obj;
});

// Schema for assigning an employee to a branch
const assignEmployeeToBranchSchema = Joi.object({
    employeeId: Joi.string()
        .regex(patterns.mongoId)
        .required()
        .messages({
            'string.empty': 'Employee ID is required',
            'string.pattern.base': 'Invalid employee ID format',
            'any.required': 'Employee ID is required'
        })
});

// Schema for bulk assigning employees to a branch
const bulkAssignEmployeesToBranchSchema = Joi.object({
    employeeIds: Joi.array()
        .items(Joi.string().regex(patterns.mongoId))
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one employee ID is required',
            'array.base': 'Employee IDs must be an array',
            'any.required': 'Employee IDs are required'
        })
});

// Schema for creating department in a branch
const branchDepartmentSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Department name is required',
            'string.min': 'Department name must be at least 2 characters',
            'string.max': 'Department name cannot exceed 100 characters',
            'any.required': 'Department name is required'
        }),

    description: Joi.string().max(500).trim(),

    managerId: Joi.string().regex(patterns.mongoId).messages({
        'string.pattern.base': 'Invalid manager ID format'
    }),

    parentDepartmentId: Joi.string().regex(patterns.mongoId).messages({
        'string.pattern.base': 'Invalid parent department ID format'
    })
});

// In utils/branch.validation.js or wherever your validation schemas are defined

// Schema for assigning admin to branch
const assignBranchAdminSchema = Joi.object({
    // Either userId or email must be provided
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).description('ID of existing user to assign'),
    email: Joi.string().email().description('Email of user to assign or create'),

    // If email is provided and user doesn't exist, these fields are required
    firstName: Joi.string().when('email', {
        is: Joi.exist(),
        then: Joi.when('userId', {
            not: Joi.exist(),
            then: Joi.required()
        })
    }).description('First name (required when creating new user)'),

    lastName: Joi.string().when('email', {
        is: Joi.exist(),
        then: Joi.when('userId', {
            not: Joi.exist(),
            then: Joi.required()
        })
    }).description('Last name (required when creating new user)')
})
    .or('userId', 'email') // Ensure that either userId or email is provided
    .description('Branch admin assignment data');

// Schema for creating geofence in a branch
const branchGeofenceSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .trim()
        .messages({
            'string.empty': 'Geofence name is required',
            'string.min': 'Geofence name must be at least 2 characters',
            'string.max': 'Geofence name cannot exceed 100 characters',
            'any.required': 'Geofence name is required'
        }),

    location: Joi.object({
        type: Joi.string().valid('Point').required(),
        coordinates: Joi.array()
            .items(Joi.number())
            .length(2)
            .required()
            .messages({
                'array.length': 'Coordinates must contain longitude and latitude values',
                'any.required': 'Coordinates are required'
            }),
        address: Joi.object({
            street: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        })
    }).required().messages({
        'any.required': 'Location information is required'
    }),

    radius: Joi.number()
        .min(50)
        .max(10000)
        .required()
        .messages({
            'number.min': 'Radius must be at least 50 meters',
            'number.max': 'Radius cannot exceed 10,000 meters',
            'any.required': 'Radius is required'
        }),

    type: Joi.string().valid('office', 'site', 'warehouse', 'custom').default('custom')
});

// Export all schemas
module.exports = {
    branchSchema,
    branchUpdateSchema,
    assignEmployeeToBranchSchema,
    bulkAssignEmployeesToBranchSchema,
    branchDepartmentSchema,
    branchGeofenceSchema,
    assignBranchAdminSchema
};