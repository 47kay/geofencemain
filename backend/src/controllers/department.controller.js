const Department = require('../models/department.model');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class DepartmentController {
  /**
   * Create a new department
   */
  async createDepartment(req, res, next) {
    try {
      const { userId } = req.user;
      // Use organizationContext instead of req.user.organizationId
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { name, description, parentDepartmentId, managerId } = req.body;

      logger.info(`Creating department ${name} for organization ${organizationId}`);

      // Check if department with same name already exists in this organization
      const existingDept = await Department.findOne({
        name,
        organizationId
      });

      if (existingDept) {
        throw new ConflictError(`Department with name '${name}' already exists in this organization`);
      }

      // If parent department specified, verify it exists
      if (parentDepartmentId) {
        const parentDept = await Department.findOne({
          _id: parentDepartmentId,
          organizationId
        });

        if (!parentDept) {
          throw new NotFoundError('Parent department not found');
        }
      }

      // Create new department
      const department = new Department({
        name,
        description,
        organizationId,
        parentDepartmentId: parentDepartmentId || null,
        managerId: managerId || null,
        createdBy: userId
      });

      await department.save();

      logger.info(`Department created: ${department._id}`);

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        department: {
          id: department._id,
          name: department.name,
          description: department.description,
          parentDepartmentId: department.parentDepartmentId,
          managerId: department.managerId,
          createdAt: department.createdAt
        }
      });
    } catch (error) {
      logger.error(`Error creating department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get all departments for an organization
   */
  async getDepartments(req, res, next) {
    try {
      // Use organizationContext instead of req.user.organizationId
      const organizationId = req.organizationContext;

      if (!organizationId) {
        // For platform admins without org context, potentially get all departments
        if (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin') {
          // Optionally implement cross-organization department listing
          // For now, require an organization context
          return res.status(400).json({
            success: false,
            message: 'Organization context is required'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Organization context is required'
          });
        }
      }

      const { parentDepartmentId } = req.query;

      // Build query
      const query = { organizationId };

      if (parentDepartmentId) {
        query.parentDepartmentId = parentDepartmentId;
      }

      // Find departments
      const departments = await Department.find(query)
          .populate('parentDepartmentId', 'name')
          .sort({ name: 1 });

      // Transform data for response
      const formattedDepartments = departments.map(dept => ({
        id: dept._id,
        name: dept.name,
        description: dept.description,
        parentDepartment: dept.parentDepartmentId ? {
          id: dept.parentDepartmentId._id,
          name: dept.parentDepartmentId.name
        } : null,
        createdAt: dept.createdAt
      }));

      res.json({
        success: true,
        departments: formattedDepartments
      });
    } catch (error) {
      logger.error(`Error getting departments: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get a specific department
   */
  async getDepartment(req, res, next) {
    try {
      // Use organizationContext instead of req.user.organizationId
      const organizationId = req.organizationContext;

      if (!organizationId && !(req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin')) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { departmentId } = req.params;

      // Build query
      const query = { _id: departmentId };

      // Add organization filter for non-platform admins
      if (organizationId) {
        query.organizationId = organizationId;
      }

      const department = await Department.findOne(query)
          .populate('parentDepartmentId', 'name');

      if (!department) {
        throw new NotFoundError('Department not found');
      }

      // Additional check for platform admins without org context
      if (!organizationId && (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin')) {
        logger.info(`Platform admin accessed department ${departmentId} from organization ${department.organizationId}`);
      }

      res.json({
        success: true,
        department: {
          id: department._id,
          name: department.name,
          description: department.description,
          parentDepartment: department.parentDepartmentId ? {
            id: department.parentDepartmentId._id,
            name: department.parentDepartmentId.name
          } : null,
          managerId: department.managerId,
          createdAt: department.createdAt
        }
      });
    } catch (error) {
      logger.error(`Error getting department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update a department
   */
  async updateDepartment(req, res, next) {
    try {
      // Use organizationContext instead of req.user.organizationId
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { departmentId } = req.params;
      const { name, description, parentDepartmentId, managerId } = req.body;

      // Find department
      const department = await Department.findOne({
        _id: departmentId,
        organizationId
      });

      if (!department) {
        throw new NotFoundError('Department not found');
      }

      // Check if new name would create a duplicate
      if (name && name !== department.name) {
        const existingDept = await Department.findOne({
          name,
          organizationId,
          _id: { $ne: departmentId }
        });

        if (existingDept) {
          throw new ConflictError(`Department with name '${name}' already exists`);
        }
      }

      // Remaining code unchanged as it already has proper organization context

      // If parent department changed, verify it exists and avoid circular reference
      if (parentDepartmentId && parentDepartmentId !== department.parentDepartmentId?.toString()) {
        // Can't make a department its own parent or create circular references
        if (parentDepartmentId === departmentId) {
          throw new ConflictError('Department cannot be its own parent');
        }

        const parentDept = await Department.findOne({
          _id: parentDepartmentId,
          organizationId
        });

        if (!parentDept) {
          throw new NotFoundError('Parent department not found');
        }

        // Check for circular reference (simple case - direct cycle)
        if (parentDept.parentDepartmentId &&
            parentDept.parentDepartmentId.toString() === departmentId) {
          throw new ConflictError('Circular reference detected in department hierarchy');
        }
      }

      // Update fields
      if (name) department.name = name;
      if (description !== undefined) department.description = description;
      if (parentDepartmentId !== undefined) department.parentDepartmentId = parentDepartmentId || null;
      if (managerId !== undefined) department.managerId = managerId || null;

      await department.save();

      logger.info(`Department updated: ${departmentId}`);

      res.json({
        success: true,
        message: 'Department updated successfully',
        department: {
          id: department._id,
          name: department.name,
          description: department.description,
          parentDepartmentId: department.parentDepartmentId,
          managerId: department.managerId,
          updatedAt: department.updatedAt
        }
      });
    } catch (error) {
      logger.error(`Error updating department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Delete a department
   */
  async deleteDepartment(req, res, next) {
    try {
      // Use organizationContext instead of req.user.organizationId
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { departmentId } = req.params;

      // Find department
      const department = await Department.findOne({
        _id: departmentId,
        organizationId
      });

      if (!department) {
        throw new NotFoundError('Department not found');
      }

      // Remaining code unchanged as it already has proper organization context

      // Check if department has children
      const childDepartments = await Department.findOne({
        parentDepartmentId: departmentId
      });

      if (childDepartments) {
        throw new ConflictError('Cannot delete department with child departments');
      }

      // Check if department has employees
      // This requires you to have an employee/user model with department reference
      // const hasEmployees = await User.findOne({ departmentId });
      // if (hasEmployees) {
      //   throw new ConflictError('Cannot delete department with assigned employees');
      // }

      // Delete department
      await Department.deleteOne({ _id: departmentId });

      logger.info(`Department deleted: ${departmentId}`);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting department: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new DepartmentController();