const Employee = require('../models/employee.model');
const User = require('../models/user.model');
const GeofenceService = require('./geofence.service');
const NotificationService = require('./notification.service');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const { withOrganizationContext } = require('../utils/query.utils');


class EmployeeService {
  constructor() {
    this.geofenceService = new GeofenceService();
    this.notificationService = new NotificationService();
  }

  /**
   * Add new employee
   */
  async addEmployee(data) {
    // Ensure organization context is provided
    if (!data.organizationId) {
      throw new Error('Organization context required for employee creation');
    }

    // Create user account first
    const user = new User({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'user',
      organization: data.organizationId
    });
    await user.save();

    // Create employee record
    const employee = new Employee({
      user: user._id,
      organization: data.organizationId,
      employeeId: await this.generateEmployeeId(
          data.organizationId,
          data.firstName,
          data.lastName
      ),
      personalInfo: data.personalInfo,
      employmentDetails: data.employmentDetails,
      metadata: {
        createdBy: data.createdBy
      }
    });
    await employee.save();

    // Send welcome email
    await this.notificationService.sendWelcomeEmail(
        user.email,
        {
          firstName: user.firstName,
          employeeId: employee.employeeId,
          temporaryPassword: data.password
        }
    );

    return employee;
  }

  /**
   * Get employee by ID with organization context
   */
  async getEmployeeById(employeeId, organizationId) {
    try {
      // Apply organization context if provided
      const query = { _id: employeeId }; // Start with basic query

      // Only add organization filter if needed
      if (organizationId) {
        // Try both field names that might be used in your schema
        query.$or = [
          { organization: organizationId },
          { organizationId: organizationId }
        ];
      }

      logger.info(`Executing employee query: ${JSON.stringify(query)}`);

      // Set timeout option and use lean() for better performance
      const options = {
        maxTimeMS: 5000, // 5 second timeout
        lean: false // We need the mongoose document for later updates
      };

      const employee = await Employee.findOne(query, null, options)
          .populate('user', 'firstName lastName email')
          .populate('employmentDetails.supervisor')
          .populate('organization');

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      return employee;
    } catch (error) {
      logger.error(`Error in getEmployeeById: ${error.message}`);
      // Handle the case where the ID is invalid
      if (error.name === 'CastError') {
        throw new NotFoundError('Invalid employee ID format');
      }
      // Handle timeout errors
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        throw new Error('Database operation timed out. Please try again later.');
      }
      // Re-throw other errors
      throw error;
    }
  }


  /**
   * Get all employees
   */
  async getEmployees(organizationId, filters = {}) {
    const { page = 1, limit = 10, status, department } = filters;

    // Apply organization filter
    const query = withOrganizationContext({}, organizationId);

    // Add additional filters
    if (status) {
      query.status = status;
    }
    if (department) {
      query['employmentDetails.department'] = department;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const employees = await Employee.find(query)
        .populate('user', 'firstName lastName email')
        .populate('employmentDetails.supervisor')
        .sort({ 'employmentDetails.startDate': -1 })
        .skip(skip)
        .limit(parseInt(limit));

    return employees;
  }

  /**
   * Get all employees across organizations (for platform admins)
   */
  async getAllEmployees(filters = {}) {
    const { page = 1, limit = 10, status, department } = filters;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (department) {
      query['employmentDetails.department'] = department;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const employees = await Employee.find(query)
        .populate('user', 'firstName lastName email')
        .populate('employmentDetails.supervisor')
        .populate('organization')
        .sort({ 'employmentDetails.startDate': -1 })
        .skip(skip)
        .limit(parseInt(limit));

    return employees;
  }

  /**
   * Get employee by employeeId with organization context
   */
  async getEmployeeByEmployeeId(employeeId, organizationId) {
    try {
      // Apply organization context if provided
      const query = { employeeId }; // Start with basic query

      // Only add organization filter if needed
      if (organizationId) {
        // Try both field names that might be used in your schema
        query.$or = [
          { organization: organizationId },
          { organizationId: organizationId }
        ];
      }

      logger.info(`Executing employee query: ${JSON.stringify(query)}`);

      // Set timeout option and use lean() for better performance
      const options = {
        maxTimeMS: 5000, // 5 second timeout
        lean: false // We need the mongoose document for later updates
      };

      const employee = await Employee.findOne(query, null, options)
          .populate('user', 'firstName lastName email')
          .populate('employmentDetails.supervisor')
          .populate('organization');

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      return employee;
    } catch (error) {
      logger.error(`Error in getEmployeeByEmployeeId: ${error.message}`);
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        throw new Error('Database operation timed out. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId, data, organizationId) {
    // Find the employee first, applying organization context if provided
    let query = { _id: employeeId };
    if (organizationId) {
      query = withOrganizationContext(query, organizationId);
    }

    const employee = await Employee.findOne(query);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Log the current employee state
    console.log('Current employee state:', JSON.stringify(employee));

    // Handle personalInfo updates
    if (data.personalInfo) {
      employee.personalInfo = employee.personalInfo || {};

      // Only update fields that are provided
      if (data.personalInfo.phone !== undefined)
        employee.personalInfo.phone = data.personalInfo.phone;
      if (data.personalInfo.address !== undefined)
        employee.personalInfo.address = data.personalInfo.address;
      if (data.personalInfo.dateOfBirth !== undefined)
        employee.personalInfo.dateOfBirth = data.personalInfo.dateOfBirth;

      // Handle nested object
      if (data.personalInfo.emergencyContact) {
        employee.personalInfo.emergencyContact = employee.personalInfo.emergencyContact || {};

        if (data.personalInfo.emergencyContact.name !== undefined)
          employee.personalInfo.emergencyContact.name = data.personalInfo.emergencyContact.name;
        if (data.personalInfo.emergencyContact.phone !== undefined)
          employee.personalInfo.emergencyContact.phone = data.personalInfo.emergencyContact.phone;
        if (data.personalInfo.emergencyContact.relationship !== undefined)
          employee.personalInfo.emergencyContact.relationship = data.personalInfo.emergencyContact.relationship;
      }
    }

    // Handle employmentDetails updates
    if (data.employmentDetails) {
      employee.employmentDetails = employee.employmentDetails || {};

      // Only update fields that are provided
      if (data.employmentDetails.startDate !== undefined)
        employee.employmentDetails.startDate = data.employmentDetails.startDate;
      if (data.employmentDetails.position !== undefined)
        employee.employmentDetails.position = data.employmentDetails.position;
      if (data.employmentDetails.department !== undefined)
        employee.employmentDetails.department = data.employmentDetails.department;
      if (data.employmentDetails.departmentId !== undefined)
        employee.employmentDetails.departmentId = data.employmentDetails.departmentId;
      if (data.employmentDetails.employmentType !== undefined)
        employee.employmentDetails.employmentType = data.employmentDetails.employmentType;
      if (data.employmentDetails.managerId !== undefined)
        employee.employmentDetails.managerId = data.employmentDetails.managerId;
      if (data.employmentDetails.officeLocation !== undefined)
        employee.employmentDetails.officeLocation = data.employmentDetails.officeLocation;
    }

    // Handle settings updates
    if (data.settings) {
      employee.settings = employee.settings || {};

      if (data.settings.locationTracking !== undefined)
        employee.settings.locationTracking = data.settings.locationTracking;
      if (data.settings.autoCheckIn !== undefined)
        employee.settings.autoCheckIn = data.settings.autoCheckIn;

      // Handle nested notifications object
      if (data.settings.notifications) {
        employee.settings.notifications = employee.settings.notifications || {};

        if (data.settings.notifications.checkIn !== undefined)
          employee.settings.notifications.checkIn = data.settings.notifications.checkIn;
        if (data.settings.notifications.checkOut !== undefined)
          employee.settings.notifications.checkOut = data.settings.notifications.checkOut;
        if (data.settings.notifications.schedule !== undefined)
          employee.settings.notifications.schedule = data.settings.notifications.schedule;
      }
    }

    // Handle status update
    if (data.status !== undefined) {
      employee.status = data.status;
    }

    // Save and return the updated employee
    await employee.save();

    // Return the fully populated employee
    return await Employee.findById(employeeId)
        .populate('user', 'firstName lastName email')
        .populate('employmentDetails.supervisor')
        .populate('organization');
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId, organizationId) {
    // Find the employee first, applying organization context if provided
    let query = { _id: employeeId };
    if (organizationId) {
      query = withOrganizationContext(query, organizationId);
    }

    const employee = await Employee.findOne(query);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Remove from all geofences first
    const geofences = await employee.getAssignedGeofences();
    for (const geofence of geofences) {
      await this.geofenceService.removeEmployeeFromGeofence(geofence._id, employeeId);
    }

    // Deactivate user account
    const user = await User.findById(employee.user);
    if (user) {
      user.status = 'inactive';
      await user.save();
    }

    // Soft delete employee
    employee.status = 'terminated';
    employee.employmentDetails.endDate = new Date();
    await employee.save();

    return true;
  }

  /**
   * Record attendance
   */
  async recordAttendance(employeeId, type, location, organizationId) {
    // Get employee with organization context
    const employee = await this.getEmployeeById(employeeId, organizationId);

    const geofenceResults = await this.geofenceService.checkLocation(
        location,
        employeeId,
        employee.organization // Pass organization context to geofence service
    );

    // Find matching geofence
    const validGeofence = geofenceResults.find(result => result.isInside);
    if (!validGeofence) {
      throw new Error('Employee not within any valid geofence');
    }

    if (type === 'check-in') {
      await employee.checkIn(validGeofence.geofenceId, location);
      await this.geofenceService.recordAttendance(
          employeeId,
          validGeofence.geofenceId,
          'check-in',
          location,
          employee.organization
      );
    } else {
      await employee.checkOut(validGeofence.geofenceId, location);
      await this.geofenceService.recordAttendance(
          employeeId,
          validGeofence.geofenceId,
          'check-out',
          location,
          employee.organization
      );
    }

    return employee;
  }

  /**
   * Update employee location
   */
  async updateLocation(employeeId, coordinates, organizationId) {
    // Get employee with organization context
    const employee = await this.getEmployeeById(employeeId, organizationId);

    await this.geofenceService.handleLocationUpdate(
        employeeId,
        coordinates,
        employee.organization
    );

    return employee;
  }

  /**
   * Get employee attendance
   */
  async getAttendance(employeeId, startDate, endDate, organizationId) {
    // Get employee with organization context to validate access
    const employee = await this.getEmployeeById(employeeId, organizationId);

    // Build query with organization context
    const query = withOrganizationContext(
        {
          employee: employeeId,
          timestamp: {}
        },
        employee.organization
    );

    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }

    const records = await AttendanceRecord.find(query)
        .populate('geofence', 'name location')
        .sort({ timestamp: -1 });

    return records;
  }

  /**
   * Request leave
   */
  async requestLeave(employeeId, data, organizationId) {
    // Get employee with organization context
    const employee = await this.getEmployeeById(employeeId, organizationId);

    const leave = {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      type: data.type,
      reason: data.reason,
      status: 'pending'
    };

    employee.leaves = employee.leaves || [];
    employee.leaves.push(leave);

    // Notify supervisor
    if (employee.employmentDetails.supervisor) {
      await this.notificationService.notifyLeaveRequest(
          employee.employmentDetails.supervisor,
          {
            employee: employee._id,
            leave,
            organization: employee.organization // Pass organization context
          }
      );
    }

    await employee.save();
    return employee;
  }

  /**
   * Generate work schedule
   */
  async generateSchedule(employeeId, startDate, endDate, organizationId) {
    // Get employee with organization context
    const employee = await this.getEmployeeById(employeeId, organizationId);

    const workDays = employee.employmentDetails.workSchedule.workDays;
    const schedule = [];

    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      const dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });

      if (workDays.includes(dayOfWeek)) {
        schedule.push({
          date: new Date(currentDate),
          startTime: employee.employmentDetails.workSchedule.hours.start,
          endTime: employee.employmentDetails.workSchedule.hours.end,
          organization: employee.organization // Include organization context
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedule;
  }

  /**
   * Generate employee ID
   * Format: First 3 letters of org name + first letters of first & last name + counter
   */
  async generateEmployeeId(organizationId, firstName, lastName) {
    try {
      // Get organization
      const Organization = require('../models/organization.model');
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      // Get organization name and capitalize it
      const orgName = organization.name.toUpperCase();
      // Take first three letters or pad if shorter
      const orgPrefix = orgName.substring(0, 3).padEnd(3, 'X');

      // Get first letter of first and last name
      const firstInitial = firstName.charAt(0).toUpperCase();
      const lastInitial = lastName.charAt(0).toUpperCase();

      // Apply organization context to the query
      const query = withOrganizationContext({}, organizationId);

      // Count existing employees in this organization for numbering
      const employeeCount = await Employee.countDocuments(query) + 1;

      // Format the employee count with leading zeros
      const countStr = String(employeeCount).padStart(4, '0');

      // Generate the employee ID
      const employeeId = `${orgPrefix}-${firstInitial}${lastInitial}-${countStr}`;

      return employeeId;
    } catch (error) {
      logger.error(`Error generating employee ID: ${error.message}`);
      // Fallback ID generation in case of error
      const timestamp = Date.now().toString().slice(-6);
      return `EMP-${timestamp}`;
    }
  }

  /**
   * Generate employee reports
   */
  async generateReport(employeeId, type, startDate, endDate, format = 'pdf', organizationId) {
    // Get employee with organization context
    const employee = await this.getEmployeeById(employeeId, organizationId);

    // Get attendance with organization context
    const attendance = await this.getAttendance(employeeId, startDate, endDate, employee.organization);

    // Calculate statistics
    const stats = {
      totalDays: attendance.length,
      presentDays: attendance.filter(a => a.type === 'check-in').length,
      avgWorkHours: await employee.calculateWorkHours(startDate, endDate),
      punctuality: attendance.filter(a => a.isOnTime).length / attendance.length * 100
    };

    // Generate report based on format
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(employee, attendance, stats);
      case 'csv':
        return this.generateCSVReport(employee, attendance, stats);
      default:
        throw new Error('Unsupported report format');
    }
  }
}



module.exports = EmployeeService;