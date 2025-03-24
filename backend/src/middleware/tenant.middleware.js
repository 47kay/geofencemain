// middleware/tenant.middleware.js

const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');
const Organization = require('../models/organization.model');

/**
 * Middleware to enforce tenant isolation and handle branch context
 */
const enforceTenantIsolation = async (req, res, next) => {
    try {
        // Skip for platform admins
        if (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin') {
            return next();
        }

        // Ensure organizationId is present
        if (!req.user.organizationId) {
            throw new ForbiddenError('No organization context found');
        }

        // Add organization context to req for use in controllers/services
        req.organizationContext = req.user.organizationId;

        // Process branch context if provided in header
        if (req.headers['x-branch-id']) {
            const branchId = req.headers['x-branch-id'];

            // For regular users and managers, verify they belong to this branch
            if (req.user.role === 'user' || req.user.role === 'manager') {
                const employee = await Employee.findOne({
                    'user': req.user.userId,
                    'organization': req.user.organizationId,
                    'branch': branchId
                });

                if (!employee) {
                    logger.warn(`User ${req.user.userId} attempted to access branch ${branchId} they don't belong to`);
                    throw new ForbiddenError('You do not have access to this branch');
                }
            }
            // For admin users, verify they are assigned as branch admin
            else if (req.user.role === 'admin') {
                const organization = await Organization.findById(req.user.organizationId);
                const branch = organization.branches?.find(
                    branch => branch._id.toString() === branchId &&
                        branch.branchAdmin?.toString() === req.user.userId
                );

                // If not branch admin, check if they're assigned to this branch as employee
                if (!branch) {
                    const employee = await Employee.findOne({
                        'user': req.user.userId,
                        'organization': req.user.organizationId,
                        'branch': branchId
                    });

                    if (!employee) {
                        logger.warn(`Admin ${req.user.userId} attempted to access branch ${branchId} they don't admin`);
                        throw new ForbiddenError('You do not have admin access to this branch');
                    }
                }
            }

            // Set branch context
            req.branchContext = branchId;
            logger.info(`Branch context set to ${branchId} for user ${req.user.userId}`);
        }

        next();
    } catch (error) {
        logger.error(`Tenant isolation error: ${error.message}`);
        next(error);
    }
};

module.exports = { enforceTenantIsolation };