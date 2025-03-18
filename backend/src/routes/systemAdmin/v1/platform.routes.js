// // routes/platform.routes.js
// const express = require('express');
// const router = express.Router();
// const PlatformController = require('../../../controllers/platform.controller');
// const { authenticate, platformAdminOnly, platformSuperAdminOnly } = require('../../../middleware/auth.middleware');
//
// // Platform administrators dashboard data
// router.get('/dashboard', authenticate, platformAdminOnly, PlatformController.getDashboardData);
//
// // Organization management
// router.get('/organizations', authenticate, platformAdminOnly, PlatformController.listOrganizations);
// router.get('/organizations/:id', authenticate, platformAdminOnly, PlatformController.getOrganization);
// router.patch('/organizations/:id', authenticate, platformAdminOnly, PlatformController.updateOrganization);
// router.post('/organizations/:id/deactivate', authenticate, platformSuperAdminOnly, PlatformController.deactivateOrganization);
// router.post('/organizations/:id/activate', authenticate, platformSuperAdminOnly, PlatformController.activateOrganization);
//
// // User management across all organizations
// router.get('/users', authenticate, platformAdminOnly, PlatformController.listAllUsers);
// router.get('/users/:id', authenticate, platformAdminOnly, PlatformController.getUser);
// router.patch('/users/:id', authenticate, platformAdminOnly, PlatformController.updateUser);
//
// // Platform administrator management
// router.get('/admins', authenticate, platformSuperAdminOnly, PlatformController.listPlatformAdmins);
// router.post('/admins', authenticate, platformSuperAdminOnly, PlatformController.createPlatformAdmin);
// router.delete('/admins/:id', authenticate, platformSuperAdminOnly, PlatformController.removePlatformAdmin);
//
// // System configuration
// router.get('/config', authenticate, platformSuperAdminOnly, PlatformController.getSystemConfiguration);
// router.patch('/config', authenticate, platformSuperAdminOnly, PlatformController.updateSystemConfiguration);
//
// // System monitoring and logs
// router.get('/logs', authenticate, platformAdminOnly, PlatformController.getSystemLogs);
// router.get('/stats', authenticate, platformAdminOnly, PlatformController.getSystemStats);
//
// module.exports = router;


// routes/platform.routes.js
const express = require('express');
const router = express.Router();
const PlatformController = require('../../../controllers/platform.controller');
const { authenticate, platformAdminOnly, platformSuperAdminOnly } = require('../../../middleware/auth.middleware');

// Note: You need to instantiate the controller since it's exported as a class
const platformController = new PlatformController();

// Platform administrators dashboard data
router.get('/dashboard', authenticate, platformAdminOnly, platformController.getDashboardData.bind(platformController));

// Organization management (only implemented methods)
router.get('/organizations', authenticate, platformAdminOnly, platformController.listOrganizations.bind(platformController));
router.get('/organizations/:id', authenticate, platformAdminOnly, platformController.getOrganization.bind(platformController));

// User management
router.get('/users', authenticate, platformAdminOnly, platformController.listUsers.bind(platformController));

// Statistics
router.get('/stats', authenticate, platformAdminOnly, platformController.getPlatformStats.bind(platformController));


// In your platform.routes.js
router.post(
    '/admins',
    authenticate,
    platformSuperAdminOnly,
    platformController.createPlatformAdmin.bind(platformController)
);

module.exports = router;