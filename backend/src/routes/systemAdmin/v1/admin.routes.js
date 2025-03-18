// routes/admin.routes.js
const express = require('express');
const adminController = require('../../../controllers/admin.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

const router = express.Router();

// Platform administration endpoints
router.get(
    '/organizations',
    authenticate,
    authorize(['platform_admin']),
    adminController.listAllOrganizations
);

// Route to invite new platform admin (protected)
router.post(
    '/platform-admins/invite',
    authenticate,
    authorize(['platform_admin']),
    adminController.invitePlatformAdmin
);

// Public route to complete registration
router.post(
    '/platform-admins/complete-registration',
    adminController.completePlatformAdminRegistration
);

module.exports = router;