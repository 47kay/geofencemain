const express = require('express');
const PlatformController = require('../../controllers/platform.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');


const router = express.Router();
const platformController = new PlatformController();

// Platform administration routes (all restricted to platform_admin role)
router.get(
    '/organizations',
    authenticate,
    authorize(['platform_admin']),
    platformController.listOrganizations.bind(platformController)
);

router.get(
    '/users',
    authenticate,
    authorize(['platform_admin']),
    platformController.listUsers.bind(platformController)
);

router.get(
    '/stats',
    authenticate,
    authorize(['platform_admin']),
    platformController.getPlatformStats.bind(platformController)
);

module.exports = router;