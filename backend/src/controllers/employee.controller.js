const EmployeeService = require('../services/employee.service');
const { validateEmployee } = require('../utils/validation');
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
   * Get all employees for an organization
   */
  async getEmployees(req, res, next) {
    try {
      const { organizationId } = req.user;
      const { page = 1, limit = 10, status, department } = req.query;
      
      const employees = await this.employeeService.getEmployees(
        organizationId,
        { page, limit, status, department }
      );
      
      logger.info(`Retrieved employees for organization: ${organizationId}`);
      res.json(employees);
    } catch (error) {
      logger.error(`Failed to get employees: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get specific employee details
   */
  async getEmployee(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      const employee = await this.employeeService.getEmployeeById(id);
      
      logger.info(`Retrieved employee: ${id}`);
      res.json(employee);
    } catch (error) {
      logger.error(`Failed to get employee: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update employee details
   */
  async updateEmployee(req, res, next) {
    try {
      const { id } = req.params;  // Changed from employeeId to match route parameter
      const validationResult = validateEmployee(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      const updatedEmployee = await this.employeeService.updateEmployee(
        id,
        req.body
      );
      
      logger.info(`Updated employee: ${id}`);
      res.json(updatedEmployee);
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