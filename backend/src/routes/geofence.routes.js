// src/routes/geofence.routes.js
const express = require('express');
const router = express.Router();
const geofenceController = require('../controllers/geofence.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateSchema } = require('../utils/validation'); // Changed from middleware/validation.middleware
const { geofenceSchema, validateCoordinates, locationCheckSchema  } = require('../utils/validation'); // Added validateCoordinates from utils/validation
const { asyncHandler } = require('../middleware/error.middleware');

// console.log('Controller methods:', {
//   createGeofence: typeof geofenceController.createGeofence,
//   getGeofences: typeof geofenceController.getGeofences,
//   getGeofence: typeof geofenceController.getGeofence,
//   updateGeofence: typeof geofenceController.updateGeofence,
//   deleteGeofence: typeof geofenceController.deleteGeofence,
//   assignEmployees: typeof geofenceController.assignEmployees,
//   removeEmployee: typeof geofenceController.removeEmployee,
//   getGeofenceActivity: typeof geofenceController.getGeofenceActivity,
//   checkLocation: typeof geofenceController.checkLocation,
//   generateReports: typeof geofenceController.generateReports,
//   updateSchedule: typeof geofenceController.updateSchedule,
//   getNearbyGeofences: typeof geofenceController.getNearbyGeofences
// });

// console.log('Middleware functions:', {
//   authenticate: typeof authMiddleware.authenticate,
//   authorize: typeof authMiddleware.authorize,
//   validateSchema: typeof validateSchema,
//   validateCoordinates: typeof validateCoordinates,
//   asyncHandler: typeof asyncHandler
// });

// Auth middleware for all geofence routes
router.use(authMiddleware.authenticate);

/**
 * @route GET /api/geofences
 * @desc Get all geofences for organization
 * @access Private
 */
router.get('/',
  asyncHandler(geofenceController.getGeofences)
);

/**
 * @route POST /api/geofences/check-location
 * @desc Check if coordinates are within any geofence
 * @access Private
 */
router.post('/check-location',
  validateSchema(locationCheckSchema),
  asyncHandler(geofenceController.checkLocation)
);

/**
 * @route GET /api/geofences/nearby
 * @desc Get nearby geofences based on coordinates
 * @access Private
 */
router.get('/nearby',
  validateSchema(locationCheckSchema),
  asyncHandler(geofenceController.getNearbyGeofences)
);

/**
 * @route POST /api/geofences
 * @desc Create new geofence
 * @access Private - Admin/Manager
 */
router.post('/',
  authMiddleware.authorize(['admin', 'manager']),
  validateSchema(geofenceSchema),
  asyncHandler(geofenceController.createGeofence)
);

/**
 * @route GET /api/geofences/:id
 * @desc Get specific geofence details
 * @access Private
 */
router.get('/:id',
  asyncHandler(geofenceController.getGeofence)
);

/**
 * @route PUT /api/geofences/:id
 * @desc Update geofence
 * @access Private - Admin/Manager
 */
router.put('/:id',
  authMiddleware.authorize(['admin', 'manager']),
  validateSchema(geofenceSchema),
  asyncHandler(geofenceController.updateGeofence)
);

/**
 * @route DELETE /api/geofences/:id
 * @desc Delete geofence
 * @access Private - Admin/Manager
 */
router.delete('/:id',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.deleteGeofence)
);

/**
 * @route POST /api/geofences/:id/employees
 * @desc Assign employees to geofence
 * @access Private - Admin/Manager
 */
router.post('/:id/employees',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.assignEmployees)
);

/**
 * @route DELETE /api/geofences/:id/employees/:employeeId
 * @desc Remove employee from geofence
 * @access Private - Admin/Manager
 */
router.delete('/:id/employees/:employeeId',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.removeEmployee)
);

/**
 * @route GET /api/geofences/:id/activity
 * @desc Get geofence activity logs
 * @access Private - Admin/Manager
 */
router.get('/:id/activity',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.getGeofenceActivity)
);

/**
 * @route GET /api/geofences/:id/reports
 * @desc Generate geofence reports
 * @access Private - Admin/Manager
 */
router.get('/:id/reports',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.generateReports)
);

/**
 * @route PUT /api/geofences/:id/schedule
 * @desc Update geofence schedule
 * @access Private - Admin/Manager
 */
router.put('/:id/schedule',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(geofenceController.updateSchedule)
);

module.exports = router;