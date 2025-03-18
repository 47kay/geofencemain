const Employee = require('../models/employee.model');
const User = require('../models/user.model');
const GeofenceService = require('./geofence.service');
const NotificationService = require('./notification.service');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class EmployeeService {
  constructor() {
    this.geofenceService = new GeofenceService();
    this.notificationService = new NotificationService();
  }

  /**
   * Add new employee
   */
  async addEmployee(data) {
    // Create user account first
    const user = new User({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'user',
      organization: data.organization
    });
    await user.save();

    // Create employee record
    const employee = new Employee({
      user: user._id,
      organization: data.organization,
      employeeId: await this.generateEmployeeId(
          data.organization,
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
  // async addEmployee(data) {
  //   // Create user account first
  //   const user = new User({
  //     email: data.email,
  //     password: data.password,
  //     firstName: data.firstName,
  //     lastName: data.lastName,
  //     role: 'user',
  //     organization: data.organization
  //   });
  //   await user.save();
  //
  //   // Create employee record
  //   const employee = new Employee({
  //     user: user._id,
  //     organization: data.organization,
  //     employeeId: await this.generateEmployeeId(data.organization),
  //     personalInfo: data.personalInfo,
  //     employmentDetails: data.employmentDetails,
  //     metadata: {
  //       createdBy: data.createdBy
  //     }
  //   });
  //   await employee.save();
  //
  //   // Send welcome email
  //   await this.notificationService.sendWelcomeEmail(
  //     user.email,
  //     {
  //       firstName: user.firstName,
  //       employeeId: employee.employeeId,
  //       temporaryPassword: data.password
  //     }
  //   );
  //
  //   return employee;
  // }

  /**
   * Get all employees
   */
  async getEmployees(organizationId, filters = {}) {
    const query = {
      organization: organizationId
    };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.department) {
      query['employmentDetails.department'] = filters.department;
    }

    const employees = await Employee.find(query)
      .populate('user', 'firstName lastName email')
      .populate('employmentDetails.supervisor')
      .sort({ 'employmentDetails.startDate': -1 });

    return employees;
  }

  /**
   * Get specific employee
   */
  async getEmployeeById(employeeId) {
    const employee = await Employee.findById(employeeId)
      .populate('user', 'firstName lastName email')
      .populate('employmentDetails.supervisor')
      .populate('organization');

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    return employee;
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId, data) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Update user information if provided
    if (data.email || data.firstName || data.lastName) {
      const user = await User.findById(employee.user);
      if (data.email) user.email = data.email;
      if (data.firstName) user.firstName = data.firstName;
      if (data.lastName) user.lastName = data.lastName;
      await user.save();
    }

    // Update employee information
    Object.assign(employee, {
      personalInfo: data.personalInfo || employee.personalInfo,
      employmentDetails: data.employmentDetails || employee.employmentDetails,
      settings: data.settings || employee.settings
    });

    await employee.save();
    return employee;
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId) {
    const employee = await Employee.findById(employeeId);
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
  async recordAttendance(employeeId, type, location) {
    const employee = await this.getEmployeeById(employeeId);
    const geofenceResults = await this.geofenceService.checkLocation(location, employeeId);
    
    // Find matching geofence
    const validGeofence = geofenceResults.find(result => result.isInside);
    if (!validGeofence) {
      throw new Error('Employee not within any valid geofence');
    }

    if (type === 'check-in') {
      await employee.checkIn(validGeofence.geofenceId, location);
      await this.geofenceService.recordAttendance(employeeId, validGeofence.geofenceId, 'check-in', location);
    } else {
      await employee.checkOut(validGeofence.geofenceId, location);
      await this.geofenceService.recordAttendance(employeeId, validGeofence.geofenceId, 'check-out', location);
    }

    return employee;
  }

  /**
   * Update employee location
   */
  async updateLocation(employeeId, coordinates) {
    const employee = await this.getEmployeeById(employeeId);
    await this.geofenceService.handleLocationUpdate(employeeId, coordinates);
    return employee;
  }

  /**
   * Get employee attendance
   */
  async getAttendance(employeeId, startDate, endDate) {
    const query = {
      employee: employeeId,
      timestamp: {}
    };

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
  async requestLeave(employeeId, data) {
    const employee = await this.getEmployeeById(employeeId);
    
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
          leave
        }
      );
    }

    await employee.save();
    return employee;
  }

  /**
   * Generate work schedule
   */
  async generateSchedule(employeeId, startDate, endDate) {
    const employee = await this.getEmployeeById(employeeId);
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
          endTime: employee.employmentDetails.workSchedule.hours.end
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedule;
  }

  /**
   * Generate employee ID
   */

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

      // Count existing employees in this organization for numbering
      const employeeCount = await Employee.countDocuments({ organization: organizationId }) + 1;

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
  // async generateEmployeeId(organizationId) {
  //   const prefix = 'EMP';
  //   const lastEmployee = await Employee.findOne(
  //     { organization: organizationId },
  //     { employeeId: 1 },
  //     { sort: { employeeId: -1 } }
  //   );
  //
  //   let number = 1;
  //   if (lastEmployee && lastEmployee.employeeId) {
  //     const lastNumber = parseInt(lastEmployee.employeeId.replace(prefix, ''));
  //     number = lastNumber + 1;
  //   }
  //
  //   return `${prefix}${String(number).padStart(6, '0')}`;
  // }

  /**
   * Generate employee ID
   * Format: First 3 letters of org name + first letters of first & last name + counter
   */
  // async generateEmployeeId(organizationId, firstName, lastName) {
  //   try {
  //     // Import required models
  //     const Invitation = require('../models/invitation.model');
  //     const User = require('../models/user.model');
  //     const Employee = require('../models/employee.model');
  //
  //     // Retrieve the invitation and user
  //     const invitation = await Invitation.findOne({ token, status: 'accepted' });
  //     const user = await User.findById(result.user.id);
  //
  //     if (!invitation || !user) {
  //       throw new Error('Could not find the necessary data');
  //     }
  //
  //     // Get organization name and capitalize it
  //     const orgName = organization.name.toUpperCase();
  //     // Take first three letters or pad if shorter
  //     const orgPrefix = orgName.substring(0, 3).padEnd(3, 'X');
  //
  //     // Get first letter of first and last name
  //     const firstInitial = user.firstName.charAt(0).toUpperCase();
  //     const lastInitial = user.lastName.charAt(0).toUpperCase();
  //
  //     // Count existing employees in this organization for numbering
  //     const employeeCount = await Employee.countDocuments({ organization: user.organization }) + 1;
  //
  //     // Format the employee count with leading zeros
  //     const countStr = String(employeeCount).padStart(4, '0');
  //
  //     // Generate the employee ID
  //     const employeeId = `${orgPrefix}-${firstInitial}${lastInitial}-${countStr}`;
  //
  //     // Get employment details from invitation
  //     const employmentDetails = invitation.additionalData?.employmentDetails || {};
  //
  //     // Create the employee record directly
  //     const employee = new Employee({
  //       user: user._id,
  //       organization: user.organization,
  //       employeeId: employeeId,
  //       personalInfo: {
  //         phone: phone || null
  //       },
  //       employmentDetails: {
  //         department: employmentDetails.department || result.user.department?.name || 'General',
  //         position: employmentDetails.position || 'Employee',
  //         employmentType: employmentDetails.employmentType || 'full-time',
  //         startDate: employmentDetails.startDate || new Date().toISOString().split('T')[0]
  //       },
  //       metadata: {
  //         createdBy: invitation.createdBy
  //       }
  //     });
  //
  //     await employee.save();
  //
  //     logger.info(`Employee record created for user: ${result.user.id} with ID: ${employeeId}`);
  //
  //     // Add employee info to the result
  //     result.employee = {
  //       id: employee._id,
  //       employeeId: employee.employeeId,
  //       status: employee.status
  //     };
  //   } catch (employeeError) {
  //     logger.error(`Failed to create employee record: ${employeeError.message}`);
  //     result.employeeCreationError = employeeError.message;
  //   }
  // }

  /**
   * Generate employee reports
   */
  async generateReport(employeeId, type, startDate, endDate, format = 'pdf') {
    const employee = await this.getEmployeeById(employeeId);
    const attendance = await this.getAttendance(employeeId, startDate, endDate);

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