const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branch.controller');
const { authorize } = require('../../middleware/auth.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');
const { validate } = require('../../middleware/validation.middleware');
// const { validate } = require('../../utils/validation');
// const { branchSchema, branchUpdateSchema, assignEmployeeToBranchSchema, assignBranchAdminSchema } = require('../../utils/branch.validation');

// const { validateRequest } = require('../../middleware/validation');
// const { assignBranchAdminSchema } = require('../../utils/branch.validation');




// Create a new branch
router.post('/',
    authorize(['superadmin']),
    asyncHandler(branchController.createBranch.bind(branchController))
);

// Alternative endpoint matching your attempt
router.post('/create',
    authorize(['superadmin']),
    asyncHandler(branchController.createBranch.bind(branchController))
);

// Get all branches
router.get('/',
    asyncHandler(branchController.getBranches.bind(branchController))
);

// Get branch by ID - all other branch-specific routes follow this
router.get('/:branchId',
    asyncHandler(branchController.getBranch.bind(branchController))
);

// Update branch
router.put('/:branchId',
    asyncHandler(branchController.updateBranch.bind(branchController))
);

// Delete branch
router.delete('/:branchId',
    authorize(['superadmin']),
    asyncHandler(branchController.deleteBranch.bind(branchController))
);

// Get branch statistics
router.get('/:branchId/statistics',
    asyncHandler(branchController.getBranchStatistics.bind(branchController))
);

// Get branch employees
router.get('/:branchId/employees',
    asyncHandler(branchController.getBranchEmployees.bind(branchController))
);

// Assign employee to branch
router.post('/:branchId/employees',
    asyncHandler(branchController.assignEmployeeToBranch.bind(branchController))
);

// Assign admin to branch
router.post('/:branchId/admin',
    authorize(['superadmin']),
    validate.assignBranchAdmin,
    asyncHandler(branchController.assignBranchAdmin.bind(branchController))
);


// In your branch.routes.js file, add:

// Create department in branch
router.post('/:branchId/departments',
    authorize(['superadmin', 'admin']),
    validate.department,
    asyncHandler(branchController.createBranchDepartment.bind(branchController))
);

// In branch.routes.js
router.get('/:branchId/departments',
    asyncHandler(branchController.getBranchDepartments.bind(branchController))
);


// In branch.routes.js

// Get geofences for a branch
router.get('/:branchId/geofences',
    asyncHandler(branchController.getBranchGeofences.bind(branchController))
);

// Create a geofence for a branch
router.post('/:branchId/geofences',
    authorize(['superadmin', 'admin']),
    asyncHandler(branchController.createBranchGeofence.bind(branchController))
);

module.exports = router;