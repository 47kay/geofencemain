const Geofence = require('../models/geofence.model');
const Employee = require('../models/employee.model');
const AttendanceRecord = require('../models/attendace.model');
const NotificationService = require('./notification.service');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class GeofenceService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Create new geofence
   */
  async createGeofence(data) {
    const geofence = new Geofence({
      ...data,
      status: 'active',
      metadata: {
        createdBy: data.userId,
        activeEmployeeCount: 0,
        totalCheckIns: 0
      }
    });

    await geofence.save();

    // If employees are assigned during creation
    if (data.employees && data.employees.length > 0) {
      await this.assignEmployeesToGeofence(geofence._id, data.employees);
    }

    return geofence;
  }

  /**
   * Get all geofences for organization
   */
  async getGeofences(organizationId, filters = {}) {
    const query = {
      organization: organizationId
    };

    if (filters.status) {
      query.status = filters.status;
    }

    const geofences = await Geofence.find(query)
      .populate('assignedEmployees.employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });

    return geofences;
  }

  /**
   * Get specific geofence
   */
  async getGeofenceById(geofenceId) {
    const geofence = await Geofence.findById(geofenceId)
      .populate('assignedEmployees.employee')
      .populate('metadata.createdBy', 'firstName lastName');

    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    return geofence;
  }

  /**
   * Update geofence
   */
  async updateGeofence(geofenceId, data) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    // Update basic info
    Object.assign(geofence, data);
    geofence.metadata.lastModifiedBy = data.userId;

    await geofence.save();
    return geofence;
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(geofenceId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    // Notify assigned employees
    await Promise.all(
      geofence.assignedEmployees.map(async (assignment) => {
        await this.notificationService.notifyEmployee(
          assignment.employee,
          'geofence_removed',
          { geofenceName: geofence.name }
        );
      })
    );

    await geofence.remove();
    return true;
  }

  /**
   * Assign employees to geofence
   */
  async assignEmployeesToGeofence(geofenceId, employeeIds) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    const employees = await Employee.find({
      _id: { $in: employeeIds },
      status: 'active'
    });

    // Validate all employees exist
    if (employees.length !== employeeIds.length) {
      throw new NotFoundError('One or more employees not found');
    }

    // Add new assignments
    for (const employee of employees) {
      if (!geofence.assignedEmployees.find(a => a.employee.equals(employee._id))) {
        geofence.assignedEmployees.push({
          employee: employee._id,
          assignedAt: new Date()
        });

        // Notify employee
        await this.notificationService.notifyEmployee(
          employee._id,
          'assigned_to_geofence',
          { geofenceName: geofence.name }
        );
      }
    }

    await geofence.save();
    await geofence.updateActiveEmployeeCount();

    return geofence;
  }

  /**
   * Remove employee from geofence
   */
  async removeEmployeeFromGeofence(geofenceId, employeeId) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    await geofence.removeEmployee(employeeId);

    // Notify employee
    await this.notificationService.notifyEmployee(
      employeeId,
      'removed_from_geofence',
      { geofenceName: geofence.name }
    );

    return geofence;
  }

  /**
   * Check if coordinates are within geofence
   */
  async checkLocation(coordinates, employeeId = null) {
    let query = {
      status: 'active',
      'location.coordinates': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: 10000 // 10km initial filter
        }
      }
    };

    if (employeeId) {
      query['assignedEmployees.employee'] = employeeId;
    }

    const geofences = await Geofence.find(query);
    
    // Precise check using geofence radius
    const results = geofences.map(geofence => ({
      geofenceId: geofence._id,
      name: geofence.name,
      isInside: geofence.isPointInside(coordinates)
    }));

    return results;
  }

  /**
   * Get geofence activity
   */
  async getGeofenceActivity(geofenceId, filters = {}) {
    const geofence = await Geofence.findById(geofenceId);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    const query = {
      geofence: geofenceId
    };

    if (filters.startDate) {
      query.timestamp = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) };
    }
    if (filters.employeeId) {
      query.employee = filters.employeeId;
    }

    const activity = await AttendanceRecord.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ timestamp: -1 });

    return activity;
  }

  /**
   * Handle employee location update
   */
  async handleLocationUpdate(employeeId, coordinates) {
    // Check all active geofences
    const geofenceResults = await this.checkLocation(coordinates, employeeId);
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    for (const result of geofenceResults) {
      if (result.isInside) {
        // Auto check-in if enabled
        if (employee.settings.autoCheckIn && 
            employee.attendance.currentStatus === 'checked-out') {
          await employee.checkIn(result.geofenceId, coordinates);
          
          // Record attendance
          await this.recordAttendance(employee._id, result.geofenceId, 'check-in', coordinates);
          
          // Notify relevant parties
          await this.notificationService.notifyGeofenceEntry(
            employee._id,
            result.geofenceId
          );
        }
      } else {
        // Handle exit if was previously inside
        if (employee.attendance.lastCheckIn?.geofence?.equals(result.geofenceId)) {
          await employee.checkOut(result.geofenceId, coordinates);
          
          // Record attendance
          await this.recordAttendance(employee._id, result.geofenceId, 'check-out', coordinates);
          
          // Notify relevant parties
          await this.notificationService.notifyGeofenceExit(
            employee._id,
            result.geofenceId
          );
        }
      }
    }

    // Update employee's last known location
    await employee.updateLocation(coordinates);
  }

  /**
   * Record attendance
   */
  async recordAttendance(employeeId, geofenceId, type, coordinates) {
    const attendance = new AttendanceRecord({
      employee: employeeId,
      geofence: geofenceId,
      type,
      location: {
        type: 'Point',
        coordinates
      },
      timestamp: new Date()
    });

    await attendance.save();

    // Update geofence statistics
    if (type === 'check-in') {
      const geofence = await Geofence.findById(geofenceId);
      await geofence.incrementCheckIns();
    }

    return attendance;
  }

  /**
   * Generate geofence reports
   */
  async generateReport(geofenceId, startDate, endDate, format = 'pdf') {
    const geofence = await this.getGeofenceById(geofenceId);
    const activity = await this.getGeofenceActivity(geofenceId, { startDate, endDate });

    // Analyze data
    const stats = {
      totalCheckIns: activity.filter(a => a.type === 'check-in').length,
      totalCheckOuts: activity.filter(a => a.type === 'check-out').length,
      uniqueEmployees: new Set(activity.map(a => a.employee._id.toString())).size,
      averageDuration: this.calculateAverageDuration(activity)
    };

    // Generate report based on format
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(geofence, activity, stats);
      case 'csv':
        return this.generateCSVReport(geofence, activity, stats);
      default:
        throw new Error('Unsupported report format');
    }
  }

  /**
   * Calculate average duration between check-in and check-out
   */
  calculateAverageDuration(activity) {
    const durations = [];
    const checkIns = new Map();

    activity.forEach(record => {
      if (record.type === 'check-in') {
        checkIns.set(record.employee._id.toString(), record.timestamp);
      } else if (record.type === 'check-out') {
        const checkIn = checkIns.get(record.employee._id.toString());
        if (checkIn) {
          durations.push(record.timestamp - checkIn);
          checkIns.delete(record.employee._id.toString());
        }
      }
    });

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }
}

module.exports = GeofenceService;