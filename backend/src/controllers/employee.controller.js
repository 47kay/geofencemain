const EmployeeService = require('../services/employee.service');
const { validateEmployee, validateEmployeeUpdate } = require('../utils/validation');
const logger = require('../utils/logger');


class EmployeeController {
  constructor() {
    this.employeeService = new EmployeeService();
  }

  /**
   * Create new employee
   */
  async createEmployee(req, res, next) {  // Changed from addEmployee
    try {
      const validationResult = validateEmployee(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      const { organizationId } = req.user;
      const employee = await this.employeeService.addEmployee({
        ...req.body,
        organizationId
      });
      
      logger.info(`Added new employee: ${employee._id}`);
      res.status(201).json(employee);
    } catch (error) {
      logger.error(`Failed to add employee: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get specific employee details
   */
  async getEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.organizationContext;

      logger.info(`Getting employee details for: ${id}, with organization context: ${organizationId || 'none'}`);

      let employee;

      try {
        // Handle different ID formats, passing organization context
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          employee = await this.employeeService.getEmployeeById(id, organizationId);
        } else {
          employee = await this.employeeService.getEmployeeByEmployeeId(id, organizationId);
        }

        logger.info(`Retrieved employee: ${id}`);
        return res.json(employee);
      } catch (error) {
        // Handle not found errors gracefully
        if (error.name === 'NotFoundError' || error.message.includes('not found')) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        throw error;
      }
    } catch (error) {
      logger.error(`Failed to get employee: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get all employees for an organization
   */
  async getEmployees(req, res, next) {
    try {
      // Get organization context from request
      const organizationId = req.organizationContext;
      const { page = 1, limit = 10, status, department } = req.query;

      let employees;

      // For platform admins without organization context, get all employees
      if (!organizationId && (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin')) {
        employees = await this.employeeService.getAllEmployees({
          page, limit, status, department
        });
        logger.info(`Retrieved all employees across organizations as ${req.user.role}`);
      } else if (organizationId) {
        // Regular case: get employees for a specific organization
        employees = await this.employeeService.getEmployees(
            organizationId,
            { page, limit, status, department }
        );
        logger.info(`Retrieved employees for organization: ${organizationId}`);
      } else {
        return res.status(400).json({
          message: 'Organization context required'
        });
      }

      res.json(employees);
    } catch (error) {
      logger.error(`Failed to get employees: ${error.message}`);
      next(error);
    }
  }


  /**
   * Update employee details
   */
  async updateEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId, role } = req.user;

      logger.info(`Attempting to update employee: ${id}, by user role: ${role}, user org: ${organizationId}`);

      // Find the employee first
      let employee;
      try {
        // Check if user is a platform admin
        const isCrossPlatformAdmin = role === 'platform_admin' || role === 'platform_superadmin';
        logger.info(`User is cross-platform admin: ${isCrossPlatformAdmin}`);

        // For platform admins, don't pass any organization context
        const orgContext = isCrossPlatformAdmin ? null : organizationId;

        // Handle different ID formats
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
          employee = await this.employeeService.getEmployeeById(id, orgContext);
        } else {
          employee = await this.employeeService.getEmployeeByEmployeeId(id, orgContext);
        }

        // Get the employee organization ID properly
        const employeeOrgId = employee.organization._id ? employee.organization._id.toString() : employee.organization.toString();
        logger.info(`Employee organization ID: ${employeeOrgId}`);

        // Platform admins can update any employee
        if (isCrossPlatformAdmin) {
          logger.info('Platform admin can update any employee, bypassing organization check');
        } else if (employeeOrgId !== organizationId.toString()) {
          logger.warn(`Organization mismatch: employee org ${employeeOrgId} vs user org ${organizationId}`);
          return res.status(403).json({ message: 'Cannot update employees from other organizations' });
        }

        // Prepare update data with schema-compliant structure
        const updateData = { ...req.body };

        // Transform personalInfo.address if it's a string
        if (updateData.personalInfo && typeof updateData.personalInfo.address === 'string') {
          const addressStr = updateData.personalInfo.address;
          updateData.personalInfo.address = {
            street: addressStr,
            city: '',
            state: '',
            country: '',
            postalCode: ''
          };
          logger.info(`Transformed address string to object: ${JSON.stringify(updateData.personalInfo.address)}`);
        }

        logger.info(`Processed update payload: ${JSON.stringify(updateData)}`);

        // Update the employee
        const updatedEmployee = await this.employeeService.updateEmployee(
            employee._id.toString(),
            updateData,
            isCrossPlatformAdmin ? null : organizationId
        );

        logger.info(`Successfully updated employee: ${id}`);
        res.json(updatedEmployee);

      } catch (error) {
        if (error.name === 'NotFoundError' || error.message.includes('not found')) {
          return res.status(404).json({ message: 'Employee not found' });
        }
        if (error.name === 'ValidationError') {
          logger.warn(`Validation error: ${error.message}`);
          return res.status(400).json({
            message: 'Invalid employee data',
            details: error.message
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to update employee: ${error.message}`);
      next(error);
    }
  }
  /**
   * Delete employee
   */
  async deleteEmployee(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      await this.employeeService.deleteEmployee(id);
      
      logger.info(`Deleted employee: ${id}`);
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      logger.error(`Failed to delete employee: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get employee attendance records
   */
  async getAttendance(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      const { startDate, endDate } = req.query;
      
      const attendance = await this.employeeService.getEmployeeAttendance(
        id,
        { startDate, endDate }
      );
      
      logger.info(`Retrieved attendance for employee: ${id}`);
      res.json(attendance);
    } catch (error) {
      logger.error(`Failed to get attendance: ${error.message}`);
      next(error);
    }
  }

  /**
   * Check in employee
   */
  async checkIn(req, res, next) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      
      const result = await this.employeeService.checkInEmployee(
        id,
        { latitude, longitude }
      );
      
      logger.info(`Checked in employee: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to check in: ${error.message}`);
      next(error);
    }
  }

  /**
   * Check out employee
   */
  async checkOut(req, res, next) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      
      const result = await this.employeeService.checkOutEmployee(
        id,
        { latitude, longitude }
      );
      
      logger.info(`Checked out employee: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to check out: ${error.message}`);
      next(error);
    }
  }

  /**
   * Record employee location
   */
  async recordLocation(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      const { latitude, longitude, timestamp } = req.body;
      
      const result = await this.employeeService.recordEmployeeLocation(
        id,
        { latitude, longitude, timestamp }
      );
      
      logger.info(`Recorded location for employee: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to record location: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get assigned geofences
   */
  async getAssignedGeofences(req, res, next) {
    try {
      const { id } = req.params;
      
      const geofences = await this.employeeService.getEmployeeGeofences(id);
      
      logger.info(`Retrieved geofences for employee: ${id}`);
      res.json(geofences);
    } catch (error) {
      logger.error(`Failed to get geofences: ${error.message}`);
      next(error);
    }
  }

  /**
   * Request leave
   */
  async requestLeave(req, res, next) {
    try {
      const { id } = req.params;
      const leaveDetails = req.body;
      
      const result = await this.employeeService.submitLeaveRequest(id, leaveDetails);
      
      logger.info(`Submitted leave request for employee: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to submit leave request: ${error.message}`);
      next(error);
    }
  }

  /**
   * Generate employee report
   */
  async generateReport(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      const { type, startDate, endDate, format = 'pdf' } = req.query;
      
      const report = await this.employeeService.generateEmployeeReport(
        id,
        { type, startDate, endDate, format }
      );
      
      logger.info(`Generated report for employee: ${id}`);
      res.json(report);
    } catch (error) {
      logger.error(`Failed to generate report: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update employee schedule
   */
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const scheduleDetails = req.body;
      
      const result = await this.employeeService.updateEmployeeSchedule(id, scheduleDetails);
      
      logger.info(`Updated schedule for employee: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to update schedule: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get employee statistics
   */
  async getStatistics(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      
      const statistics = await this.employeeService.getEmployeeStatistics(
        id,
        { startDate, endDate }
      );
      
      logger.info(`Retrieved statistics for employee: ${id}`);
      res.json(statistics);
    } catch (error) {
      logger.error(`Failed to get statistics: ${error.message}`);
      next(error);
    }
  }
}

module.exports = EmployeeController;