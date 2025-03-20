const Geofence = require('../models/geofence.model');
const Employee = require('../models/employee.model');
const AttendanceRecord = require('../models/attendance.model'); // Fixed model name
const NotificationService = require('./notification.service');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const { withOrganizationContext } = require('../utils/query.utils');

class GeofenceService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Create new geofence with proper multi-tenancy
   */
  async createGeofence(data) {
    // Ensure organization context is provided
    if (!data.organizationId) {
      throw new Error('Organization context required for geofence creation');
    }

    // Check for existing geofence with same name in the organization
    const existingQuery = withOrganizationContext(
        { name: data.name },
        data.organizationId
    );

    const existingGeofence = await Geofence.findOne(existingQuery);
    if (existingGeofence) {
      throw new ConflictError(`Geofence with name "${data.name}" already exists in this organization`);
    }

    const geofence = new Geofence({
      name: data.name,
      description: data.description,
      organization: data.organizationId,
      location: data.location,
      radius: data.radius,
      type: data.type || 'custom',
      schedule: data.schedule || {
        enabled: false,
        workDays: [],
        workHours: { start: '09:00', end: '17:00' }
      },
      settings: data.settings || {
        entryNotification: true,
        exitNotification: true,
        autoCheckIn: false,
        graceperiod: 5
      },
      status: 'active',
      metadata: {
        createdBy: data.userId,
        activeEmployeeCount: 0,
        totalCheckIns: 0
      }
    });

    await geofence.save();

    // Option to assign all employees in the organization
    if (data.assignAllEmployees) {
      // Find all active employees in the organization
      const employees = await Employee.find({
        organization: data.organizationId,
        status: 'active'
      });

      if (employees.length > 0) {
        // Extract employee IDs
        const employeeIds = employees.map(emp => emp._id);

        // Assign all employees to the geofence
        await this.assignEmployeesToGeofence(geofence._id, employeeIds, data.organizationId);

        logger.info(`Assigned all ${employeeIds.length} employees to geofence: ${geofence._id}`);
      }
    }
    // If specific employees are assigned during creation
    else if (data.employees && data.employees.length > 0) {
      await this.assignEmployeesToGeofence(geofence._id, data.employees, data.organizationId);
    }

    return geofence;
  }

  /**
   * Get all geofences for organization with multi-tenant support
   */
  async getGeofences(organizationId, filters = {}) {
    const { page = 1, limit = 10, status, type } = filters;

    // Apply organization filter
    const query = withOrganizationContext({}, organizationId);

    // Add additional filters
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limit_num = parseInt(limit);

    const geofences = await Geofence.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit_num);

    // Get total count for pagination
    const total = await Geofence.countDocuments(query);

    return {
      geofences,
      pagination: {
        total,
        page: parseInt(page),
        limit: limit_num,
        pages: Math.ceil(total / limit_num)
      }
    };
  }

  /**
   * Get all geofences across organizations (for platform admins)
   */
  async getAllGeofences(filters = {}) {
    const { page = 1, limit = 10, status } = filters;
    const query = {};

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limit_num = parseInt(limit);

    const geofences = await Geofence.find(query)
        .populate('organization', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit_num);

    // Get total count for pagination
    const total = await Geofence.countDocuments(query);

    return {
      geofences,
      pagination: {
        total,
        page: parseInt(page),
        limit: limit_num,
        pages: Math.ceil(total / limit_num)
      }
    };
  }

  /**
   * Get specific geofence with multi-tenant support
   */
  async getGeofenceById(geofenceId, organizationId) {
    try {
      // Apply organization context if provided
      const query = organizationId ?
          withOrganizationContext({ _id: geofenceId }, organizationId) :
          { _id: geofenceId };

      const options = {
        maxTimeMS: 5000 // Set timeout to 5 seconds
      };

      const geofence = await Geofence.findOne(query, null, options)
          .populate('assignedEmployees.employee', 'employeeId user')
          .populate('metadata.createdBy', 'firstName lastName');

      if (!geofence) {
        throw new NotFoundError('Geofence not found');
      }

      return geofence;
    } catch (error) {
      logger.error(`Error in getGeofenceById: ${error.message}`);
      // Handle timeout errors
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        throw new Error('Database operation timed out. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Update geofence with multi-tenant support
   */
  async updateGeofence(geofenceId, data, organizationId) {
    // Apply organization context if provided
    const query = organizationId ?
        withOrganizationContext({ _id: geofenceId }, organizationId) :
        { _id: geofenceId };

    const geofence = await Geofence.findOne(query);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    // Update basic fields if provided
    if (data.name) geofence.name = data.name;
    if (data.description) geofence.description = data.description;
    if (data.type) geofence.type = data.type;
    if (data.location) geofence.location = data.location;
    if (data.radius) geofence.radius = data.radius;
    if (data.schedule) geofence.schedule = data.schedule;
    if (data.settings) geofence.settings = data.settings;
    if (data.status) geofence.status = data.status;

    // Update metadata
    if (data.userId) {
      geofence.metadata.lastModifiedBy = data.userId;
    }

    await geofence.save();
    return geofence;
  }

  /**
   * Update geofence schedule with multi-tenant support
   */
  async updateGeofenceSchedule(geofenceId, schedule, organizationId) {
    // Apply organization context if provided
    const query = organizationId ?
        withOrganizationContext({ _id: geofenceId }, organizationId) :
        { _id: geofenceId };

    const geofence = await Geofence.findOne(query);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    geofence.schedule = {
      ...geofence.schedule,
      ...schedule
    };

    await geofence.save();
    return geofence;
  }

  /**
   * Delete geofence with multi-tenant support
   */
  async deleteGeofence(geofenceId, organizationId) {
    // Apply organization context if provided
    const query = organizationId ?
        withOrganizationContext({ _id: geofenceId }, organizationId) :
        { _id: geofenceId };

    const geofence = await Geofence.findOne(query);
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }

    // Notify assigned employees
    for (const assignment of geofence.assignedEmployees) {
      await this.notificationService.notifyEmployee(
          assignment.employee,
          'geofence_removed',
          {
            geofenceName: geofence.name,
            organization: geofence.organization // Pass organization context
          }
      );
    }

    // Soft delete by setting status to archived
    geofence.status = 'archived';
    await geofence.save();

    return { success: true, message: 'Geofence archived successfully' };
  }

  /**
   * Assign employees to geofence with multi-tenant support
   */
  async assignEmployeesToGeofence(geofenceId, employeeIds, organizationId) {
    // Get geofence with organization context
    const geofence = await this.getGeofenceById(geofenceId, organizationId);

    // Apply organization context to employee query
    const query = organizationId ?
        withOrganizationContext({ _id: { $in: employeeIds }, status: 'active' }, organizationId) :
        { _id: { $in: employeeIds }, status: 'active' };

    const employees = await Employee.find(query);

    // Validate all employees exist
    if (employees.length !== employeeIds.length) {
      throw new NotFoundError('One or more employees not found or not active');
    }

    // Add new assignments
    for (const employee of employees) {
      if (!geofence.assignedEmployees.find(a => a.employee.equals(employee._id))) {
        geofence.assignedEmployees.push({
          employee: employee._id,
          assignedAt: new Date(),
          assignedBy: organizationId
        });

        // Notify employee
        await this.notificationService.notifyEmployee(
            employee._id,
            'assigned_to_geofence',
            {
              geofenceName: geofence.name,
              organization: geofence.organization // Pass organization context
            }
        );
      }
    }

    await geofence.save();
    await geofence.updateActiveEmployeeCount();

    return geofence;
  }

  /**
   * Remove employee from geofence with multi-tenant support
   */
  async removeEmployeeFromGeofence(geofenceId, employeeId, organizationId) {
    // Get geofence with organization context
    const geofence = await this.getGeofenceById(geofenceId, organizationId);

    await geofence.removeEmployee(employeeId);

    // Notify employee
    await this.notificationService.notifyEmployee(
        employeeId,
        'removed_from_geofence',
        {
          geofenceName: geofence.name,
          organization: geofence.organization // Pass organization context
        }
    );

    return geofence;
  }

  /**
   * Check if coordinates are within geofence with multi-tenant support
   */
  async checkLocation(coordinates, employeeId = null, organizationId = null) {
    // Build base query for nearby geofences
    let query = {
      status: 'active',
      'location.coordinates': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          $maxDistance: 10000 // 10km initial filter
        }
      }
    };

    // Apply organization filter if provided
    if (organizationId) {
      query = withOrganizationContext(query, organizationId);
    }

    // Add employee filter if provided
    if (employeeId) {
      query['assignedEmployees.employee'] = employeeId;
    }

    // Find nearby geofences
    const geofences = await Geofence.find(query);

    // Precise check if point is inside each geofence
    const results = geofences.map(geofence => ({
      geofenceId: geofence._id,
      name: geofence.name,
      type: geofence.type,
      isInside: geofence.isPointInside(coordinates),
      organization: geofence.organization // Include organization context in results
    }));

    return results;
  }

  /**
   * Check a specific location for an organization
   */
  async checkLocationInGeofence(organizationId, coordinates) {
    const { latitude, longitude } = coordinates;
    return await this.checkLocation([longitude, latitude], null, organizationId);
  }

  /**
   * Get nearby geofences
   */
  async getNearbyGeofences(organizationId, params) {
    const { latitude, longitude, radius = 1000 } = params;
    const coordinates = [parseFloat(longitude), parseFloat(latitude)];

    const query = withOrganizationContext({
      status: 'active',
      'location.coordinates': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          $maxDistance: parseInt(radius)
        }
      }
    }, organizationId);

    const geofences = await Geofence.find(query).lean();

    // Add distance and inside information
    return geofences.map(geofence => {
      const isInside = geofence.isPointInside ?
          geofence.isPointInside(coordinates) :
          false;

      return {
        ...geofence,
        isInside,
        distance: getDistanceFromLatLonInM(
            latitude,
            longitude,
            geofence.location.coordinates[1],
            geofence.location.coordinates[0]
        )
      };
    });
  }

  /**
   * Get geofence activity with multi-tenant support
   */
  async getGeofenceActivity(geofenceId, filters = {}, organizationId = null) {
    // Verify geofence exists and belongs to the organization
    const geofence = await this.getGeofenceById(geofenceId, organizationId);

    // Build query for attendance records
    const query = {
      geofence: geofenceId
    };

    // Add organization filter if available
    if (organizationId) {
      query.organization = organizationId;
    }

    // Add date filters
    if (filters.startDate) {
      query.timestamp = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) };
    }

    // Add employee filter
    if (filters.employeeId) {
      query.employee = filters.employeeId;
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    // Get attendance records
    const activity = await AttendanceRecord.find(query)
        .populate('employee', 'employeeId user')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

    // Count total for pagination
    const total = await AttendanceRecord.countDocuments(query);

    return {
      activity,
      geofence: {
        id: geofence._id,
        name: geofence.name,
        type: geofence.type
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Handle employee location update with multi-tenant support
   */
  async handleLocationUpdate(employeeId, coordinates, organizationId = null) {
    // Check for employee in organization context
    const employeeQuery = organizationId ?
        withOrganizationContext({ _id: employeeId }, organizationId) :
        { _id: employeeId };

    const employee = await Employee.findOne(employeeQuery);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Get the employee's organization for further queries
    const employeeOrgId = employee.organization;

    // Check all geofences in the same organization that the employee might be entering/exiting
    const geofenceResults = await this.checkLocation(coordinates, employeeId, employeeOrgId);

    // Record employee's current location regardless of geofence status
    await employee.updateLocation(coordinates);

    // Handle geofence entries/exits
    for (const result of geofenceResults) {
      if (result.isInside) {
        // Employee is inside a geofence

        // Auto check-in if enabled and currently checked out
        if (employee.settings?.autoCheckIn && employee.attendance?.currentStatus === 'checked-out') {
          // Update employee record
          await employee.checkIn(result.geofenceId, coordinates);

          // Record attendance
          await this.recordAttendance(
              employeeId,
              result.geofenceId,
              'check-in',
              coordinates,
              employeeOrgId
          );

          // Notify relevant parties
          await this.notificationService.notifyGeofenceEntry(
              employeeId,
              result.geofenceId,
              employeeOrgId
          );
        }
      } else {
        // Employee is outside a geofence, but check if they were previously inside
        // by comparing with their last known location

        const wasInside = employee.attendance?.lastCheckIn?.geofence?.equals(result.geofenceId);

        if (wasInside && employee.attendance?.currentStatus === 'checked-in') {
          // Auto check-out as they've left the geofence
          await employee.checkOut(result.geofenceId, coordinates);

          // Record attendance
          await this.recordAttendance(
              employeeId,
              result.geofenceId,
              'check-out',
              coordinates,
              employeeOrgId
          );

          // Notify relevant parties
          await this.notificationService.notifyGeofenceExit(
              employeeId,
              result.geofenceId,
              employeeOrgId
          );
        }
      }
    }

    return {
      employeeId,
      timestamp: new Date(),
      location: coordinates,
      geofenceResults: geofenceResults.map(r => ({
        id: r.geofenceId,
        name: r.name,
        isInside: r.isInside
      }))
    };
  }

  /**
   * Record attendance with multi-tenant support
   */
  async recordAttendance(employeeId, geofenceId, type, coordinates, organizationId = null) {
    // Create new attendance record with organization context
    const attendance = new AttendanceRecord({
      employee: employeeId,
      geofence: geofenceId,
      type,
      location: {
        type: 'Point',
        coordinates
      },
      timestamp: new Date(),
      organization: organizationId // Set organization context
    });

    await attendance.save();

    // Update geofence statistics
    if (type === 'check-in') {
      const geofence = await this.getGeofenceById(geofenceId, organizationId);
      await geofence.incrementCheckIns();
    }

    return attendance;
  }

  /**
   * Generate geofence reports with multi-tenant support
   */
  async generateGeofenceReport(geofenceId, filters = {}, organizationId = null) {
    const { startDate, endDate, type = 'summary' } = filters;

    // Get geofence with organization context
    const geofence = await this.getGeofenceById(geofenceId, organizationId);

    // Get activity with organization context
    const activityResponse = await this.getGeofenceActivity(
        geofenceId,
        { startDate, endDate, limit: 1000 },
        organizationId
    );

    const activity = activityResponse.activity;

    // Analyze data
    const checkIns = activity.filter(a => a.type === 'check-in');
    const checkOuts = activity.filter(a => a.type === 'check-out');

    const stats = {
      totalCheckIns: checkIns.length,
      totalCheckOuts: checkOuts.length,
      uniqueEmployees: new Set(activity.map(a => a.employee._id.toString())).size,
      averageDuration: this.calculateAverageDuration(activity),
      peakHours: this.calculatePeakHours(checkIns),
      organization: geofence.organization // Include organization context
    };

    return {
      geofence: {
        id: geofence._id,
        name: geofence.name,
        type: geofence.type,
        location: geofence.location,
        radius: geofence.radius
      },
      dateRange: {
        from: startDate,
        to: endDate
      },
      stats,
      reportType: type
    };
  }

  /**
   * Calculate average duration between check-in and check-out
   */
  calculateAverageDuration(activity) {
    // Group activity by employee and date
    const sessions = {};

    activity.forEach(record => {
      const employeeId = record.employee._id.toString();
      const date = record.timestamp.toISOString().split('T')[0];
      const key = `${employeeId}-${date}`;

      if (!sessions[key]) {
        sessions[key] = { employee: employeeId, date, checkIns: [], checkOuts: [] };
      }

      if (record.type === 'check-in') {
        sessions[key].checkIns.push(record.timestamp);
      } else if (record.type === 'check-out') {
        sessions[key].checkOuts.push(record.timestamp);
      }
    });

    // Calculate durations for complete sessions
    let totalDuration = 0;
    let sessionCount = 0;

    Object.values(sessions).forEach(session => {
      if (session.checkIns.length > 0 && session.checkOuts.length > 0) {
        // Sort timestamps
        session.checkIns.sort();
        session.checkOuts.sort();

        // Calculate duration for each check-in/check-out pair
        const firstCheckIn = new Date(session.checkIns[0]);
        const lastCheckOut = new Date(session.checkOuts[session.checkOuts.length - 1]);

        const duration = (lastCheckOut - firstCheckIn) / (1000 * 60); // in minutes

        if (duration > 0) {
          totalDuration += duration;
          sessionCount++;
        }
      }
    });

    return sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
  }

  /**
   * Calculate peak check-in hours
   */
  calculatePeakHours(checkIns) {
    const hourCounts = Array(24).fill(0);

    checkIns.forEach(record => {
      const hour = record.timestamp.getHours();
      hourCounts[hour]++;
    });

    // Find peak hours (top 3)
    const peakHours = [];
    for (let i = 0; i < 3; i++) {
      const max = Math.max(...hourCounts);
      if (max === 0) break;

      const hour = hourCounts.indexOf(max);
      peakHours.push({ hour, count: max });
      hourCounts[hour] = 0;
    }

    return peakHours;
  }
}

// Helper function to calculate distance between coordinates
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  return Math.round(distance);
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = GeofenceService;