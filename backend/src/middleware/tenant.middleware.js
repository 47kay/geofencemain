// middleware/tenant.middleware.js
const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

const enforceTenantIsolation = (req, res, next) => {
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

        next();
    } catch (error) {
        logger.error(`Tenant isolation error: ${error.message}`);
        next(error);
    }
};

module.exports = { enforceTenantIsolation };