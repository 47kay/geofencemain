const express = require('express');
const router = express.Router();
const employeeController = require('../../controllers/employee.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { validateSchema, validateDateRange, employeeSchema } = require('../../utils/validation');
// const { validateDateRange } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');

console.log('Attendance route handlers:', {
  authorizeOrSelf: typeof authMiddleware.authorizeOrSelf,
  validateDateRange: typeof validateDateRange,
  getAttendance: typeof employeeController.getAttendance,
  asyncHandler: typeof asyncHandler
});

console.log('Route dependencies:', {
  validateDateRange: typeof validateDateRange,
  employeeController: {
      getAttendance: typeof employeeController.getAttendance,
      getAssignedGeofences: typeof employeeController.getAssignedGeofences,
      getStatistics: typeof employeeController.getStatistics
  },
  authMiddleware: {
      authorizeOrSelf: typeof authMiddleware.authorizeOrSelf
  }
});


console.log('Employee Controller Methods:', {
  createEmployee: typeof employeeController.createEmployee,
  getEmployees: typeof employeeController.getEmployees,
  getEmployee: typeof employeeController.getEmployee,
  updateEmployee: typeof employeeController.updateEmployee,
  deleteEmployee: typeof employeeController.deleteEmployee,
  getAttendance: typeof employeeController.getAttendance,  // This is likely undefined
  checkIn: typeof employeeController.checkIn,
  checkOut: typeof employeeController.checkOut,
  recordLocation: typeof employeeController.recordLocation,
  getAssignedGeofences: typeof employeeController.getAssignedGeofences,
  requestLeave: typeof employeeController.requestLeave,
  generateReport: typeof employeeController.generateReport,
  updateSchedule: typeof employeeController.updateSchedule,
  getStatistics: typeof employeeController.getStatistics
});

// Auth middleware for all employee routes
router.use(authMiddleware.authenticate);

/**
 * @route   POST /api/employees
 * @desc    Add new employee
 * @access  Private - Admin/Manager
 */
router.post('/',
  authMiddleware.authorize(['admin', 'manager']),
  validateSchema(employeeSchema),
  asyncHandler(employeeController.createEmployee)
);

/**
 * @route   GET /api/employees
 * @desc    Get all employees for organization
 * @access  Private - Admin/Manager
 */
router.get('/',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(employeeController.getEmployees)
);

/**
 * @route   GET /api/employees/:id
 * @desc    Get specific employee details
 * @access  Private - Admin/Manager/Self
 */
router.get('/:id',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  asyncHandler(employeeController.getEmployee)
);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee details
 * @access  Private - Admin/Manager
 */
router.put('/:id',
  authMiddleware.authorize(['admin', 'manager']),
  validateSchema(employeeSchema),
  asyncHandler(employeeController.updateEmployee)
);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Private - Admin only
 */
router.delete('/:id',
  authMiddleware.authorize(['admin']),
  asyncHandler(employeeController.deleteEmployee)
);

/**
 * @route   GET /api/employees/:id/attendance
 * @desc    Get employee attendance records
 * @access  Private - Admin/Manager/Self
 */
router.get('/:id/attendance',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  validateDateRange,
  asyncHandler(employeeController.getAttendance)
);

/**
 * @route   POST /api/employees/:id/check-in
 * @desc    Record employee check-in
 * @access  Private - Self only
 */
router.post('/:id/check-in',
  authMiddleware.authorizeSelf(),
  asyncHandler(employeeController.checkIn)
);

/**
 * @route   POST /api/employees/:id/check-out
 * @desc    Record employee check-out
 * @access  Private - Self only
 */
router.post('/:id/check-out',
  authMiddleware.authorizeSelf(),
  asyncHandler(employeeController.checkOut)
);

/**
 * @route   POST /api/employees/:id/location
 * @desc    Update employee location
 * @access  Private - Self only
 */
router.post('/:id/location',
  authMiddleware.authorizeSelf(),
  asyncHandler(employeeController.recordLocation)
);

/**
 * @route   GET /api/employees/:id/geofences
 * @desc    Get employee's assigned geofences
 * @access  Private - Admin/Manager/Self
 */
router.get('/:id/geofences',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  asyncHandler(employeeController.getAssignedGeofences)
);

/**
 * @route   POST /api/employees/:id/leave
 * @desc    Request or record leave
 * @access  Private - Admin/Manager/Self
 */
router.post('/:id/leave',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  asyncHandler(employeeController.requestLeave)
);

/**
 * @route   GET /api/employees/:id/reports
 * @desc    Generate employee reports
 * @access  Private - Admin/Manager/Self
 */
router.get('/:id/reports',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  validateDateRange,
  asyncHandler(employeeController.generateReport)
);

/**
 * @route   PUT /api/employees/:id/schedule
 * @desc    Update employee work schedule
 * @access  Private - Admin/Manager
 */
router.put('/:id/schedule',
  authMiddleware.authorize(['admin', 'manager']),
  asyncHandler(employeeController.updateSchedule)
);

/**
 * @route   GET /api/employees/:id/statistics
 * @desc    Get employee statistics
 * @access  Private - Admin/Manager/Self
 */
router.get('/:id/statistics',
  authMiddleware.authorizeOrSelf(['admin', 'manager']),
  validateDateRange,
  asyncHandler(employeeController.getStatistics)
);

module.exports = router;