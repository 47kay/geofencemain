const Branch = require('../models/branch.model');
const User = require('../models/user.model');
const Employee = require('../models/employee.model');
const Department = require('../models/department.model');
const Geofence = require('../models/geofence.model');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const crypto = require('crypto');
const NotificationService = require('./notification.service');

class BranchService {
    constructor() {
        this.notificationService = new NotificationService();
    }


    // In BranchService.js
    /**
     * Get branch admin assignment options
     * @param {string} organizationId - Organization ID
     */
    async getBranchAdminOptions(organizationId) {
        // Get all users who are admins or can be made admins
        const potentialAdmins = await User.find({
            organization: organizationId,
            role: { $in: ['admin', 'user', 'manager'] } // Include users that could be promoted
        })
            .select('_id firstName lastName email role')
            .sort({ firstName: 1, lastName: 1 });

        // Get all branches in the organization
        const branches = await Branch.find({
            organization: organizationId
        })
            .select('_id name status branchAdmin')
            .populate('branchAdmin', 'firstName lastName email')
            .sort({ name: 1 });

        // Classify administrators
        const admins = potentialAdmins.filter(user => user.role === 'admin');
        const nonAdmins = potentialAdmins.filter(user => user.role !== 'admin');

        // Group branches by admin status
        const branchesWithAdmin = branches.filter(branch => branch.branchAdmin);
        const branchesWithoutAdmin = branches.filter(branch => !branch.branchAdmin);

        return {
            admins: {
                existingAdmins: admins,
                potentialAdmins: nonAdmins
            },
            branches: {
                all: branches,
                withAdmin: branchesWithAdmin,
                withoutAdmin: branchesWithoutAdmin
            }
        };
    }

    /**
     * Get all branches for an organization with enhanced filtering
     */
    async getBranches(organizationId, filters = {}) {
        const { status, page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = filters;

        const query = { organization: organizationId };

        // Apply status filter if provided
        if (status) {
            query.status = status;
        }

        // Determine sort configuration
        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute the query with pagination and populate required fields
        const branches = await Branch.find(query)
            .populate('branchAdmin', 'firstName lastName email')
            .populate('metadata.createdBy', 'firstName lastName')
            .sort(sortConfig)
            .skip((page - 1) * limit)
            .limit(limit);

        // Get total count for pagination
        const total = await Branch.countDocuments(query);

        // Calculate branch-specific metrics if needed
        const branchesWithStats = await Promise.all(
            branches.map(async (branch) => {
                // Get employee count for each branch if not already populated
                if (typeof branch.metadata.employeeCount !== 'number') {
                    await branch.updateEmployeeCount();
                }

                return branch;
            })
        );

        return {
            branches: branchesWithStats,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Get branch by ID
     */
    async getBranchById(branchId, organizationId = null) {
        const query = { _id: branchId };

        if (organizationId) {
            query.organization = organizationId;
        }

        const branch = await Branch.findOne(query)
            .populate('branchAdmin', 'firstName lastName email')
            .populate('metadata.createdBy', 'firstName lastName')
            .populate('metadata.lastModifiedBy', 'firstName lastName');

        if (!branch) {
            throw new NotFoundError('Branch not found');
        }

        return branch;
    }

    /**
     * Create a new branch
     */
    async createBranch(data, userId) {
        // Check for existing branch with same name in organization
        const existingBranch = await Branch.findOne({
            organization: data.organizationId,
            name: data.name
        });

        if (existingBranch) {
            throw new ConflictError(`Branch with name "${data.name}" already exists in this organization`);
        }

        // Generate unique code for branch
        const uniqueCode = await Branch.generateUniqueCode(data.organizationId, data.name);

        // Create branch object
        const branch = new Branch({
            name: data.name,
            organization: data.organizationId,
            uniqueCode,
            address: data.address,
            contact: data.contact,
            status: 'active',
            metadata: {
                createdBy: userId
            }
        });

        // Handle branch admin assignment
        if (data.branchAdminId) {
            // Check if user exists and belongs to organization
            const branchAdmin = await User.findOne({
                _id: data.branchAdminId,
                organization: data.organizationId
            });

            if (!branchAdmin) {
                throw new NotFoundError('Branch admin not found or not part of this organization');
            }

            // Assign admin role if not already an admin
            if (branchAdmin.role !== 'admin' && branchAdmin.role !== 'superadmin') {
                branchAdmin.role = 'admin';
                await branchAdmin.save();
                logger.info(`User ${branchAdmin._id} promoted to admin for branch role`);
            }

            branch.branchAdmin = branchAdmin._id;
        } else if (data.branchAdminEmail) {
            // Find or create user by email
            let branchAdmin = await User.findOne({
                email: data.branchAdminEmail,
                organization: data.organizationId
            });

            if (!branchAdmin) {
                // Create new user if doesn't exist
                const temporaryPassword = crypto.randomBytes(8).toString('hex');

                branchAdmin = new User({
                    email: data.branchAdminEmail,
                    password: temporaryPassword,
                    firstName: data.branchAdminFirstName || 'Branch',
                    lastName: data.branchAdminLastName || 'Admin',
                    role: 'admin',
                    organization: data.organizationId,
                    status: 'pending',
                    createdBy: userId,
                    invitationStatus: 'pending',
                    invitationToken: crypto.randomBytes(32).toString('hex'),
                    invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });

                await branchAdmin.save();

                // Send invitation email
                await this.notificationService.sendInvitationEmail(branchAdmin.email, {
                    organizationName: data.organizationName,
                    branchName: data.name,
                    invitationToken: branchAdmin.invitationToken,
                    temporaryPassword,
                    role: 'admin'
                });

                logger.info(`Created new branch admin user ${branchAdmin._id} for branch`);
            } else if (branchAdmin.role !== 'admin' && branchAdmin.role !== 'superadmin') {
                // Promote existing user to admin
                branchAdmin.role = 'admin';
                await branchAdmin.save();
                logger.info(`User ${branchAdmin._id} promoted to admin for branch role`);
            }

            branch.branchAdmin = branchAdmin._id;
        }

        // Save branch
        await branch.save();
        logger.info(`Created branch ${branch._id} for organization ${data.organizationId}`);

        return branch;
    }

    /**
     * Update branch details
     */
    async updateBranch(branchId, updateData, userId, organizationId = null) {
        // Find branch
        const branch = await this.getBranchById(branchId, organizationId);

        // Update basic fields
        if (updateData.name) branch.name = updateData.name;
        if (updateData.address) branch.address = updateData.address;
        if (updateData.contact) branch.contact = updateData.contact;
        if (updateData.status) branch.status = updateData.status;

        // Update metadata
        branch.metadata.lastModifiedBy = userId;

        // Handle branch admin change
        if (updateData.branchAdminId) {
            // Check if user exists and belongs to organization
            const branchAdmin = await User.findOne({
                _id: updateData.branchAdminId,
                organization: branch.organization
            });

            if (!branchAdmin) {
                throw new NotFoundError('Branch admin not found or not part of this organization');
            }

            // Assign admin role if not already an admin
            if (branchAdmin.role !== 'admin' && branchAdmin.role !== 'superadmin') {
                branchAdmin.role = 'admin';
                await branchAdmin.save();
                logger.info(`User ${branchAdmin._id} promoted to admin for branch role`);
            }

            branch.branchAdmin = branchAdmin._id;
        } else if (updateData.branchAdminEmail) {
            // Find or create user by email
            let branchAdmin = await User.findOne({
                email: updateData.branchAdminEmail,
                organization: branch.organization
            });

            if (!branchAdmin) {
                // Create new user if doesn't exist
                const temporaryPassword = crypto.randomBytes(8).toString('hex');

                branchAdmin = new User({
                    email: updateData.branchAdminEmail,
                    password: temporaryPassword,
                    firstName: updateData.branchAdminFirstName || 'Branch',
                    lastName: updateData.branchAdminLastName || 'Admin',
                    role: 'admin',
                    organization: branch.organization,
                    status: 'pending',
                    createdBy: userId,
                    invitationStatus: 'pending',
                    invitationToken: crypto.randomBytes(32).toString('hex'),
                    invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });

                await branchAdmin.save();

                // Send invitation email
                await this.notificationService.sendInvitationEmail(branchAdmin.email, {
                    branchName: branch.name,
                    invitationToken: branchAdmin.invitationToken,
                    temporaryPassword,
                    role: 'admin'
                });

                logger.info(`Created new branch admin user ${branchAdmin._id} for branch ${branchId}`);
            } else if (branchAdmin.role !== 'admin' && branchAdmin.role !== 'superadmin') {
                // Promote existing user to admin
                branchAdmin.role = 'admin';
                await branchAdmin.save();
                logger.info(`User ${branchAdmin._id} promoted to admin for branch role`);
            }

            branch.branchAdmin = branchAdmin._id;
        }

        // Save branch
        await branch.save();
        logger.info(`Updated branch ${branchId}`);

        return branch;
    }

    /**
     * Delete branch
     */
    async deleteBranch(branchId, organizationId = null) {
        const branch = await this.getBranchById(branchId, organizationId);

        // Check if branch has employees
        const employeeCount = await Employee.countDocuments({
            branch: branchId
        });

        if (employeeCount > 0) {
            throw new ConflictError(`Cannot delete branch with ${employeeCount} assigned employees`);
        }

        // Check if branch has departments
        const departmentCount = await Department.countDocuments({
            branch: branchId
        });

        if (departmentCount > 0) {
            throw new ConflictError(`Cannot delete branch with ${departmentCount} assigned departments`);
        }

        // Check if branch has geofences
        const geofenceCount = await Geofence.countDocuments({
            branch: branchId
        });

        if (geofenceCount > 0) {
            throw new ConflictError(`Cannot delete branch with ${geofenceCount} assigned geofences`);
        }

        // Delete branch
        await Branch.deleteOne({ _id: branchId });
        logger.info(`Deleted branch ${branchId}`);

        return { success: true, message: 'Branch deleted successfully' };
    }

    /**
     * Get branch statistics
     */
    async getBranchStatistics(branchId, organizationId = null) {
        const branch = await this.getBranchById(branchId, organizationId);

        // Update counters
        await branch.updateEmployeeCount();
        await branch.updateDepartmentCount();
        await branch.updateGeofenceCount();

        // Get attendance statistics if available
        let attendanceStats = {};
        try {
            if (global.AttendanceService) {
                const attendanceService = new global.AttendanceService();
                attendanceStats = await attendanceService.getBranchAttendanceStats(branchId);
            }
        } catch (error) {
            logger.warn(`Failed to get attendance stats for branch ${branchId}: ${error.message}`);
        }

        return {
            employeeCount: branch.metadata.employeeCount,
            departmentCount: branch.metadata.departmentCount,
            geofenceCount: branch.metadata.geofenceCount,
            attendance: attendanceStats
        };
    }

    /**
     * Get branch employees
     */
    async getBranchEmployees(branchId, filters = {}, organizationId = null) {
        // Verify branch exists
        await this.getBranchById(branchId, organizationId);

        const { status, page = 1, limit = 10 } = filters;

        // Build query
        const query = { branch: branchId };

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const employees = await Employee.find(query)
            .populate('user', 'firstName lastName email')
            .sort({ 'employmentDetails.position': 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Get total count
        const total = await Employee.countDocuments(query);

        return {
            employees,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Assign employee to branch
     */
    async assignEmployeeToBranch(branchId, employeeId, organizationId = null) {
        // Verify branch exists
        await this.getBranchById(branchId, organizationId);

        // Find employee
        const employee = await Employee.findById(employeeId);

        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        // If organizationId is provided, verify employee belongs to the organization
        if (organizationId && employee.organization.toString() !== organizationId) {
            throw new ForbiddenError('Employee does not belong to this organization');
        }

        // Update employee's branch
        employee.branch = branchId;
        await employee.save();

        logger.info(`Assigned employee ${employeeId} to branch ${branchId}`);

        return employee;
    }

    /**
     * Remove employee from branch
     */
    async removeEmployeeFromBranch(branchId, employeeId, organizationId = null) {
        // Verify branch exists
        await this.getBranchById(branchId, organizationId);

        // Find employee
        const employee = await Employee.findById(employeeId);

        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        // Verify employee belongs to the branch
        if (employee.branch.toString() !== branchId) {
            throw new ConflictError('Employee is not assigned to this branch');
        }

        // Remove employee from branch
        employee.branch = null;
        await employee.save();

        logger.info(`Removed employee ${employeeId} from branch ${branchId}`);

        return { success: true, message: 'Employee removed from branch successfully' };
    }

    /**
     * Get branch departments
     */
    async getBranchDepartments(branchId, filters = {}, organizationId = null) {
        // Verify branch exists
        await this.getBranchById(branchId, organizationId);

        const { page = 1, limit = 10 } = filters;

        // Build query
        const query = { branch: branchId };

        // Execute query with pagination
        const departments = await Department.find(query)
            .populate('manager', 'firstName lastName email')
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Get total count
        const total = await Department.countDocuments(query);

        return {
            departments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get branch geofences
     */
    async getBranchGeofences(branchId, filters = {}, organizationId = null) {
        // Verify branch exists
        await this.getBranchById(branchId, organizationId);

        const { status, page = 1, limit = 10 } = filters;

        // Build query
        const query = { branch: branchId };

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const geofences = await Geofence.find(query)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Get total count
        const total = await Geofence.countDocuments(query);

        return {
            geofences,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }


    /**
     * Assign admin to branch
     * @param {string} branchId - ID of the branch
     * @param {Object} assignmentData - Admin assignment data
     * @param {string} userId - ID of user making the request
     * @param {string} organizationId - Organization ID
     */
    async assignAdminToBranch(branchId, assignmentData, userId, organizationId) {
        // Find branch
        const branch = await this.getBranchById(branchId, organizationId);

        let adminUser;

        // Case 1: Assign by user ID (existing employee or admin)
        if (assignmentData.userId) {
            adminUser = await User.findOne({
                _id: assignmentData.userId,
                organization: organizationId
            });

            if (!adminUser) {
                throw new NotFoundError('User not found or not part of this organization');
            }

            // Check if this user is an employee
            const employee = await Employee.findOne({
                user: adminUser._id,
                organization: organizationId
            });

            // Update existing employee's role if needed
            if (employee && adminUser.role !== 'admin' && adminUser.role !== 'superadmin') {
                adminUser.role = 'admin';
                await adminUser.save();
                logger.info(`Employee ${adminUser._id} promoted to admin for branch ${branchId}`);
            }
        }
        // Case 2: Assign by email (might be new or existing user)
        else if (assignmentData.email) {
            // Try to find an existing user
            adminUser = await User.findOne({
                email: assignmentData.email.toLowerCase(),
                organization: organizationId
            });

            if (adminUser) {
                // Update role if needed
                if (adminUser.role !== 'admin' && adminUser.role !== 'superadmin') {
                    adminUser.role = 'admin';
                    await adminUser.save();
                    logger.info(`User ${adminUser._id} promoted to admin for branch ${branchId}`);
                }
            } else {
                // Create new user
                const temporaryPassword = crypto.randomBytes(8).toString('hex');

                adminUser = new User({
                    email: assignmentData.email.toLowerCase(),
                    password: temporaryPassword,
                    firstName: assignmentData.firstName || 'Branch',
                    lastName: assignmentData.lastName || 'Admin',
                    role: 'admin',
                    organization: organizationId,
                    status: 'pending',
                    createdBy: userId,
                    invitationStatus: 'pending',
                    invitationToken: crypto.randomBytes(32).toString('hex'),
                    invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });

                await adminUser.save();

                // Get organization name for email
                let organizationName = 'Your Organization';
                try {
                    const organization = await Organization.findById(organizationId);
                    if (organization) {
                        organizationName = organization.name;
                    }
                } catch (err) {
                    logger.warn(`Failed to get organization name: ${err.message}`);
                }

                // Send invitation email
                await this.notificationService.sendInvitationEmail(adminUser.email, {
                    organizationName: organizationName,
                    branchName: branch.name,
                    invitationToken: adminUser.invitationToken,
                    temporaryPassword,
                    role: 'admin'
                });

                logger.info(`Created new branch admin user ${adminUser._id} for branch ${branchId}`);
            }
        } else {
            throw new Error('Either userId or email must be provided');
        }

        // Assign admin to branch
        branch.branchAdmin = adminUser._id;
        await branch.save();

        logger.info(`Assigned admin ${adminUser._id} to branch ${branchId}`);

        return {
            branch,
            admin: {
                _id: adminUser._id,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                email: adminUser.email,
                role: adminUser.role,
                status: adminUser.status
            }
        };
    }
}

module.exports = BranchService;