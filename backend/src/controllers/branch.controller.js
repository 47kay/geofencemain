const BranchService = require('../services/branch.service');
const logger = require('../utils/logger');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const Branch = require('../models/branch.model');
const Geofence = require('../models/geofence.model');
const Department = require('../models/department.model');

class BranchController {
    constructor() {
        this.branchService = new BranchService();
    }






/**
 * Get geofences for a branch
 */
async getBranchGeofences(req, res, next) {
    try {
        const organizationId = req.organizationContext;
        const { branchId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        // Verify branch exists and belongs to the organization
        await this.branchService.getBranchById(branchId, organizationId);

        // Build query
        const query = {
            branch: branchId,
            organization: organizationId
        };

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const geofences = await Geofence.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        // Get total count
        const total = await Geofence.countDocuments(query);

        logger.info(`Retrieved geofences for branch ${branchId}`);
        res.json({
            success: true,
            data: {
                geofences,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        logger.error(`Failed to get branch geofences: ${error.message}`);
        next(error);
    }
}

/**
 * Create a geofence for a branch
 */
async createBranchGeofence(req, res, next) {
    try {
        const organizationId = req.organizationContext;
        const { branchId } = req.params;
        const userId = req.user.userId;

        // Verify branch exists and belongs to organization
        const branch = await this.branchService.getBranchById(branchId, organizationId);

        // Check permissions - superadmin can create for any branch, admin only for their branch
        if (req.user.role === 'admin') {
            const isBranchAdmin = branch.branchAdmin &&
                branch.branchAdmin._id.toString() === userId;

            if (!isBranchAdmin) {
                logger.warn(`Admin ${userId} attempted to create geofence for branch they don't administer`);
                return res.status(403).json({
                    success: false,
                    message: 'You can only create geofences for branches you administer'
                });
            }
        }

        // Create geofence
        const geofence = new Geofence({
            name: req.body.name,
            description: req.body.description,
            organization: organizationId,
            branch: branchId,
            location: req.body.location,
            radius: req.body.radius,
            type: req.body.type || 'custom',
            schedule: req.body.schedule || {
                enabled: false,
                workDays: [],
                workHours: { start: '09:00', end: '17:00' }
            },
            settings: req.body.settings || {
                entryNotification: true,
                exitNotification: true,
                autoCheckIn: false,
                graceperiod: 5
            },
            status: 'active',
            metadata: {
                createdBy: userId,
                activeEmployeeCount: 0,
                totalCheckIns: 0
            }
        });

        await geofence.save();

        // Update branch geofence count if supported
        if (typeof branch.updateGeofenceCount === 'function') {
            await branch.updateGeofenceCount();
        }

        logger.info(`Created geofence ${geofence._id} for branch ${branchId}`);
        res.status(201).json({
            success: true,
            message: 'Geofence created successfully',
            data: geofence
        });
    } catch (error) {
        logger.error(`Failed to create branch geofence: ${error.message}`);
        next(error);
    }
}



    /**
     * Get all branches for the organization
     */
    async getBranches(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const {
                status,
                page,
                limit,
                sortBy = 'name',
                sortOrder = 'asc'
            } = req.query;

            const result = await this.branchService.getBranches(
                organizationId,
                { status, page, limit, sortBy, sortOrder }
            );

            logger.info(`Retrieved ${result.branches.length} branches for organization: ${organizationId}`);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Failed to get branches: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get branch by ID
     */
    async getBranch(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;

            const branch = await this.branchService.getBranchById(branchId, organizationId);

            logger.info(`Retrieved branch ${branchId} for organization: ${organizationId}`);
            res.json(branch);
        } catch (error) {
            logger.error(`Failed to get branch: ${error.message}`);
            next(error);
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(req, res, next) {
        try {
            const organizationId = req.organizationContext;

            // Only superadmins can create branches
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {
                logger.warn(`User ${req.user.userId} with role ${req.user.role} attempted to create branch`);
                return res.status(403).json({
                    success: false,
                    message: 'Only organization superadmins can create branches'
                });
            }

            // Get organization name for notifications
            let organizationName = 'Your Organization';
            try {
                const Organization = require('../models/organization.model');
                const org = await Organization.findById(organizationId);
                if (org) {
                    organizationName = org.name;
                }
            } catch (err) {
                logger.warn(`Failed to get organization name: ${err.message}`);
            }

            const branchData = {
                ...req.body,
                organizationId,
                organizationName
            };

            const branch = await this.branchService.createBranch(branchData, req.user.userId);

            logger.info(`Created branch ${branch._id} for organization: ${organizationId}`);
            res.status(201).json(branch);
        } catch (error) {
            logger.error(`Failed to create branch: ${error.message}`);
            next(error);
        }
    }

    /**
     * Update branch
     */
    async updateBranch(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;

            // Check permissions - superadmins or branch admin
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {

                // Check if user is branch admin
                const branch = await this.branchService.getBranchById(branchId, organizationId);
                const isBranchAdmin = branch.branchAdmin &&
                    branch.branchAdmin._id.toString() === req.user.userId;

                if (!isBranchAdmin) {
                    logger.warn(`User ${req.user.userId} attempted to update branch without permissions`);
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to update this branch'
                    });
                }
            }

            const updatedBranch = await this.branchService.updateBranch(
                branchId,
                req.body,
                req.user.userId,
                organizationId
            );

            logger.info(`Updated branch ${branchId} for organization: ${organizationId}`);
            res.json(updatedBranch);
        } catch (error) {
            logger.error(`Failed to update branch: ${error.message}`);
            next(error);
        }
    }

    /**
     * Delete branch
     */
    async deleteBranch(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;

            // Only superadmins can delete branches
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {
                logger.warn(`User ${req.user.userId} attempted to delete branch without permissions`);
                return res.status(403).json({
                    success: false,
                    message: 'Only organization superadmins can delete branches'
                });
            }

            const result = await this.branchService.deleteBranch(branchId, organizationId);

            logger.info(`Deleted branch ${branchId} from organization: ${organizationId}`);
            res.json(result);
        } catch (error) {
            logger.error(`Failed to delete branch: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get branch statistics
     */
    async getBranchStatistics(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;

            const statistics = await this.branchService.getBranchStatistics(branchId, organizationId);

            logger.info(`Retrieved statistics for branch ${branchId}`);
            res.json(statistics);
        } catch (error) {
            logger.error(`Failed to get branch statistics: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get branch employees
     */
    async getBranchEmployees(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;
            const { status, page, limit } = req.query;

            // Check if user has access to the branch
            if (req.user.role === 'admin') {
                // Check if user is branch admin
                const branch = await this.branchService.getBranchById(branchId, organizationId);
                const isBranchAdmin = branch.branchAdmin &&
                    branch.branchAdmin._id.toString() === req.user.userId;

                if (!isBranchAdmin) {
                    logger.warn(`Admin ${req.user.userId} attempted to view employees of branch they don't manage`);
                    return res.status(403).json({
                        success: false,
                        message: 'You can only view employees in branches you manage'
                    });
                }
            }

            const result = await this.branchService.getBranchEmployees(
                branchId,
                { status, page, limit },
                organizationId
            );

            logger.info(`Retrieved employees for branch ${branchId}`);
            res.json(result);
        } catch (error) {
            logger.error(`Failed to get branch employees: ${error.message}`);
            next(error);
        }
    }

    /**
     * Assign employee to branch
     */
    async assignEmployeeToBranch(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;
            const { employeeId } = req.body;

            // Check permissions - superadmins or branch admins
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {

                // If admin, check if they are the branch admin
                if (req.user.role === 'admin') {
                    const branch = await this.branchService.getBranchById(branchId, organizationId);
                    const isBranchAdmin = branch.branchAdmin &&
                        branch.branchAdmin._id.toString() === req.user.userId;

                    if (!isBranchAdmin) {
                        logger.warn(`Admin ${req.user.userId} attempted to manage employees for branch they don't admin`);
                        return res.status(403).json({
                            success: false,
                            message: 'You can only manage employees in branches you administer'
                        });
                    }
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions to assign employees'
                    });
                }
            }

            const employee = await this.branchService.assignEmployeeToBranch(
                branchId,
                employeeId,
                organizationId
            );

            logger.info(`Assigned employee ${employeeId} to branch ${branchId}`);
            res.json({
                success: true,
                message: 'Employee assigned to branch successfully',
                employee
            });
        } catch (error) {
            logger.error(`Failed to assign employee to branch: ${error.message}`);
            next(error);
        }
    }

    // Update the assignBranchAdmin controller method
    async assignBranchAdmin(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;
            const assignmentData = req.body;

            // Ensure superadmin access
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {
                logger.warn(`User ${req.user.userId} with role ${req.user.role} attempted to assign branch admin`);
                return res.status(403).json({
                    success: false,
                    message: 'Only superadmins can assign branch admins'
                });
            }

            const result = await this.branchService.assignAdminToBranch(
                branchId,
                assignmentData,
                req.user.userId,
                organizationId
            );

            // Get updated list of branches without admins after this assignment
            const branchesWithoutAdmin = await Branch.find({
                organization: organizationId,
                branchAdmin: { $exists: false }
            })
                .select('_id name')
                .sort({ name: 1 });

            logger.info(`Assigned admin to branch ${branchId} for organization: ${organizationId}`);
            res.json({
                success: true,
                message: 'Branch admin assigned successfully',
                data: result,
                branchesWithoutAdmin: branchesWithoutAdmin
            });
        } catch (error) {
            logger.error(`Failed to assign branch admin: ${error.message}`);
            next(error);
        }
    }



    /**
     * Create a new department in a branch
     */
    async createBranchDepartment(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;
            const departmentData = req.body;

            // Check permissions - superadmins or branch admins
            if (req.user.role !== 'superadmin' &&
                req.user.role !== 'platform_admin' &&
                req.user.role !== 'platform_superadmin') {

                // If admin, check if they are the branch admin
                if (req.user.role === 'admin') {
                    const branch = await this.branchService.getBranchById(branchId, organizationId);
                    const isBranchAdmin = branch.branchAdmin &&
                        branch.branchAdmin._id.toString() === req.user.userId;

                    if (!isBranchAdmin) {
                        logger.warn(`Admin ${req.user.userId} attempted to create department for branch they don't admin`);
                        return res.status(403).json({
                            success: false,
                            message: 'You can only create departments in branches you administer'
                        });
                    }
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions to create departments'
                    });
                }
            }

            // Create department
            const department = new Department({
                name: departmentData.name,
                description: departmentData.description || '',
                organizationId: organizationId,
                branch: branchId,
                parentDepartmentId: departmentData.parentDepartmentId || null,
                managerId: departmentData.managerId || null,
                createdBy: req.user.userId
            });

            // Check for duplicate department name in this branch
            const existingDept = await Department.findOne({
                name: departmentData.name,
                branch: branchId
            });

            if (existingDept) {
                throw new ConflictError(`Department with name '${departmentData.name}' already exists in this branch`);
            }

            // Save department
            await department.save();

            // Update branch department count if your Branch model supports this
            const branch = await Branch.findById(branchId);
            if (branch && typeof branch.updateDepartmentCount === 'function') {
                await branch.updateDepartmentCount();
            }

            logger.info(`Created department ${department._id} in branch ${branchId}`);
            res.status(201).json({
                success: true,
                message: 'Department created successfully',
                department: {
                    id: department._id,
                    name: department.name,
                    description: department.description,
                    parentDepartmentId: department.parentDepartmentId,
                    managerId: department.managerId,
                    branch: department.branch,
                    createdAt: department.createdAt
                }
            });
        } catch (error) {
            logger.error(`Failed to create department: ${error.message}`);
            next(error);
        }
    }




// Add this method to your BranchController class
    async getBranchDepartments(req, res, next) {
        try {
            const organizationId = req.organizationContext;
            const { branchId } = req.params;
            const { status, page = 1, limit = 10 } = req.query;

            // Verify the branch exists
            await this.branchService.getBranchById(branchId, organizationId);

            // Find departments in this branch
            const query = {
                branch: branchId,
                organizationId
            };

            // Apply optional filters
            if (status) {
                query.status = status;
            }

            // Execute query with pagination
            const departments = await Department.find(query)
                .populate('parentDepartmentId', 'name')
                .populate('managerId', 'firstName lastName email')
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Get total count
            const total = await Department.countDocuments(query);

            // Format response
            const formattedDepartments = departments.map(dept => ({
                id: dept._id,
                name: dept.name,
                description: dept.description,
                parentDepartment: dept.parentDepartmentId ? {
                    id: dept.parentDepartmentId._id,
                    name: dept.parentDepartmentId.name
                } : null,
                manager: dept.managerId ? {
                    id: dept.managerId._id,
                    name: `${dept.managerId.firstName} ${dept.managerId.lastName}`,
                    email: dept.managerId.email
                } : null,
                createdAt: dept.createdAt
            }));

            logger.info(`Retrieved departments for branch ${branchId}`);
            res.json({
                success: true,
                departments: formattedDepartments,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            logger.error(`Failed to get branch departments: ${error.message}`);
            next(error);
        }
    }
}

module.exports = new BranchController();