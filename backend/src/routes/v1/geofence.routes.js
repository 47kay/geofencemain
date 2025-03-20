// src/routes/geofence.routes.js
const express = require('express');
const router = express.Router();
const GeofenceController = require('../../controllers/geofence.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const { validateSchema, locationCheckSchema, geofenceSchema } = require('../../utils/validation'); // Changed from middleware/validation.middleware
const { asyncHandler } = require('../../middleware/error.middleware');



const geofenceController = new GeofenceController();


// Auth middleware for all geofence routes
router.use(authMiddleware.authenticate);

/**
 * @route GET /api/geofences
 * @desc Get all geofences for organization
 * @access Private
 */
router.get('/', function(req, res, next) {
    geofenceController.getGeofences(req, res, next);
});

/**
 * @route POST /api/geofences/check-location
 * @desc Check if coordinates are within any geofence
 * @access Private
 */
router.post('/check-location',
    validateSchema(locationCheckSchema),
    function(req, res, next) {
        geofenceController.checkLocation(req, res, next);
    }
);

/**
 * @route GET /api/geofences/nearby
 * @desc Get nearby geofences based on coordinates
 * @access Private
 */
router.get('/nearby',
    function(req, res, next) {
        geofenceController.getNearbyGeofences(req, res, next);
    }
);

/**
 * @route POST /api/geofences
 * @desc Create new geofence
 * @access Private - Admin/Manager
 */
router.post('/',
    authMiddleware.authorize(['admin', 'manager']),
    validateSchema(geofenceSchema),
    function(req, res, next) {
        geofenceController.createGeofence(req, res, next);
    }
);

/**
 * @route GET /api/geofences/:id
 * @desc Get specific geofence details
 * @access Private
 */
router.get('/:id', function(req, res, next) {
    geofenceController.getGeofence(req, res, next);
});

/**
 * @route PUT /api/geofences/:id
 * @desc Update geofence
 * @access Private - Admin/Manager
 */
router.put('/:id',
    authMiddleware.authorize(['admin', 'manager']),
    validateSchema(geofenceSchema),
    function(req, res, next) {
        geofenceController.updateGeofence(req, res, next);
    }
);

/**
 * @route DELETE /api/geofences/:id
 * @desc Delete geofence
 * @access Private - Admin/Manager
 */
router.delete('/:id',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.deleteGeofence(req, res, next);
    }
);

/**
 * @route POST /api/geofences/:id/employees
 * @desc Assign employees to geofence
 * @access Private - Admin/Manager
 */
router.post('/:id/employees',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.assignEmployees(req, res, next);
    }
);

/**
 * @route DELETE /api/geofences/:id/employees/:employeeId
 * @desc Remove employee from geofence
 * @access Private - Admin/Manager
 */
router.delete('/:id/employees/:employeeId',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.removeEmployee(req, res, next);
    }
);

/**
 * @route GET /api/geofences/:id/activity
 * @desc Get geofence activity logs
 * @access Private - Admin/Manager
 */
router.get('/:id/activity',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.getGeofenceActivity(req, res, next);
    }
);

/**
 * @route GET /api/geofences/:id/report
 * @desc Generate geofence reports
 * @access Private - Admin/Manager
 */
router.get('/:id/report',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.generateReport(req, res, next);
    }
);

/**
 * @route PUT /api/geofences/:id/schedule
 * @desc Update geofence schedule
 * @access Private - Admin/Manager
 */
router.put('/:id/schedule',
    authMiddleware.authorize(['admin', 'manager']),
    function(req, res, next) {
        geofenceController.updateSchedule(req, res, next);
    }
);


module.exports = router;