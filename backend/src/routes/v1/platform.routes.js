const express = require('express');
const PlatformController = require('../../controllers/platform.controller');
const { authenticate, authorize, platformAdminOnly, platformSuperAdminOnly } = require('../../middleware/auth.middleware');

const router = express.Router();
const platformController = new PlatformController();

// Platform administrators dashboard data
router.get(
    '/dashboard',
    authenticate,
    platformAdminOnly,
    platformController.getDashboardData.bind(platformController)
);

// Organization management
router.get(
    '/organizations',
    authenticate,
    platformAdminOnly,
    platformController.listOrganizations.bind(platformController)
);

router.get(
    '/organizations/:id',
    authenticate,
    platformAdminOnly,
    platformController.getOrganization.bind(platformController)
);

// User management
router.get(
    '/users',
    authenticate,
    platformAdminOnly,
    platformController.listUsers.bind(platformController)
);

// Statistics
router.get(
    '/stats',
    authenticate,
    platformAdminOnly,
    platformController.getPlatformStats.bind(platformController)
);

// Admin creation
router.post(
    '/admins',
    authenticate,
    platformSuperAdminOnly,
    platformController.createPlatformAdmin.bind(platformController)
);

module.exports = router;