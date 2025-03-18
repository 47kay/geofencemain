const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/department.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate, sanitizeRequest } = require('../../middleware/validation.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');

// Apply sanitization to all routes
router.use(sanitizeRequest);

// Apply authentication to all routes
router.use(authenticate);

// Create department - Admin only
router.post('/', 
  authorize(['admin', 'superadmin']),
  validate.department, // You'll need to add this to your validation middleware
  asyncHandler(departmentController.createDepartment)
);

// Get all departments
router.get('/', 
  asyncHandler(departmentController.getDepartments)
);

// Get a specific department
router.get('/:departmentId', 
  asyncHandler(departmentController.getDepartment)
);

// Update department - Admin only
router.put('/:departmentId', 
  authorize(['admin', 'superadmin']),
  validate.department, // You'll need to add this to your validation middleware
  asyncHandler(departmentController.updateDepartment)
);

// Delete department - Admin only
router.delete('/:departmentId', 
  authorize(['admin', 'superadmin']),
  asyncHandler(departmentController.deleteDepartment)
);

module.exports = router;