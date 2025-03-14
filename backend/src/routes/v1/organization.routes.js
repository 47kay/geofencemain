const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/organization.controller');
const geofenceController = require('../../controllers/geofence.controller');  // Add this line
const { validate, sanitizeRequest } = require('../../middleware/validation.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');
const { validateSchema, geofenceSchema, locationCheckSchema } = require('../../utils/validation');


// Auth middleware for all organization routes
router.use(authenticate);

// Apply sanitization to all requests
router.use(sanitizeRequest);

/**
 * @route   GET /api/organizations/me
 * @desc    Get current organization details
 * @access  Private
 */
router.get('/me',
  asyncHandler(organizationController.getOrganization)
);

/**
 * @route   PUT /api/organizations/me
 * @desc    Update organization details
 * @access  Private - Admin only
 */
router.put('/me',
  authorize(['admin']),
  validate.organization,
  asyncHandler(organizationController.updateOrganization)
);

/**
 * @route   GET /api/organizations/me/statistics
 * @desc    Get organization statistics
 * @access  Private - Admin/Manager
 */
router.get('/me/statistics',
  authorize(['admin', 'manager']),
  asyncHandler(organizationController.getStatistics)
);

/**
 * @route   GET /api/organizations/me/activity
 * @desc    Get organization activity logs
 * @access  Private - Admin/Manager
 */
router.get('/me/activity',
  authorize(['admin', 'manager']),
  asyncHandler(organizationController.getActivityLogs)
);

/**
 * @route   PUT /api/organizations/me/settings
 * @desc    Update organization settings
 * @access  Private - Admin only
 */
router.put('/me/settings',
  authorize(['admin']),
  asyncHandler(organizationController.updateSettings)
);

/**
 * @route   POST /api/organizations/me/departments
 * @desc    Add new department
 * @access  Private - Admin only
 */
router.post('/me/departments',
  authorize(['admin']),
  asyncHandler(organizationController.addDepartment)
);

router.post('/check-location',
  validateSchema(locationCheckSchema),
  asyncHandler(geofenceController.checkLocation)
);

/**
 * @route   PUT /api/organizations/me/departments/:departmentId
 * @desc    Update department
 * @access  Private - Admin only
 */
router.put('/me/departments/:departmentId',
  authorize(['admin']),
  asyncHandler(organizationController.updateDepartment)
);

/**
 * @route   DELETE /api/organizations/me/departments/:departmentId
 * @desc    Delete department
 * @access  Private - Admin only
 */
router.delete('/me/departments/:departmentId',
  authorize(['admin']),
  asyncHandler(organizationController.deleteDepartment)
);

/**
 * @route   GET /api/organizations/me/audit-logs
 * @desc    Get organization audit logs
 * @access  Private - Admin only
 */
router.get('/me/audit-logs',
  authorize(['admin']),
  asyncHandler(organizationController.getAuditLogs)
);

/**
 * @route   POST /api/organizations/me/invite
 * @desc    Invite user to organization
 * @access  Private - Admin only
 */
router.post('/me/invite',
  authorize(['admin']),
  asyncHandler(organizationController.inviteUser)
);

module.exports = router;