const Organization = require('../models/organization.model');
const User = require('../models/user.model');
const Geofence = require('../models/geofence.model');
const Employee = require('../models/employee.model');
const NotificationService = require('./notification.service');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const crypto = require('crypto');

class OrganizationService {
    constructor() {
      this.notificationService = new NotificationService();
    }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId, userContext = null) {
    // For platform admins, allow access to any organization
    // For regular users, ensure they can only access their own organization
    if (userContext && userContext.role !== 'platform_admin' &&
        userContext.role !== 'platform_superadmin' &&
        userContext.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to requested organization');
    }

    const organization = await Organization.findById(organizationId)
        .populate('subscription')
        .populate('metadata.createdBy', 'firstName lastName email');

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return organization;
  }

  /**
   * Update organization details
   */
  async updateOrganization(organizationId, data, userId) {
    const organization = await this.getOrganizationById(organizationId);

    // Update basic info
    Object.assign(organization, {
      name: data.name || organization.name,
      industry: data.industry || organization.industry,
      address: data.address || organization.address,
      contact: data.contact || organization.contact
    });

    organization.metadata.lastModifiedBy = userId;
    organization.metadata.lastModifiedAt = new Date();

    await organization.save();
    return organization;
  }

  /**
   * Update organization settings
   */
  async updateSettings(organizationId, settings, userId) {
    const organization = await this.getOrganizationById(organizationId);

    // Update settings
    organization.settings = {
      ...organization.settings,
      ...settings
    };

    organization.metadata.lastModifiedBy = userId;
    organization.metadata.lastModifiedAt = new Date();

    await organization.save();
    return organization;
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId, startDate, endDate) {
    const organization = await this.getOrganizationById(organizationId);

    // Get employees count
    const employeeStats = await Employee.aggregate([
      { $match: { organization: organization._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get geofences count
    const geofenceStats = await Geofence.aggregate([
      { $match: { organization: organization._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get attendance statistics
    const attendanceStats = await this.getAttendanceStats(organizationId, startDate, endDate);

    return {
      employees: this.formatStats(employeeStats),
      geofences: this.formatStats(geofenceStats),
      attendance: attendanceStats
    };
  }

  /**
   * Get organization activity logs
   */
  async getActivityLogs(organizationId, options = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      startDate,
      endDate
    } = options;

    const query = {
      organization: organizationId
    };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'firstName lastName email')
      .populate('metadata.reference');

    const total = await ActivityLog.countDocuments(query);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Add department
   */
  async addDepartment(organizationId, departmentData, userId) {
    const organization = await this.getOrganizationById(organizationId);

    // Check if department already exists
    const departmentExists = organization.departments?.some(
      dept => dept.name === departmentData.name
    );

    if (departmentExists) {
      throw new ConflictError('Department already exists');
    }

    // Add department
    organization.departments = organization.departments || [];
    organization.departments.push({
      ...departmentData,
      createdBy: userId,
      createdAt: new Date()
    });

    await organization.save();
    return organization;
  }

  /**
   * Update department
   */
  async updateDepartment(organizationId, departmentId, data, userId) {
    const organization = await this.getOrganizationById(organizationId);

    const departmentIndex = organization.departments?.findIndex(
      dept => dept._id.toString() === departmentId
    );

    if (departmentIndex === -1) {
      throw new NotFoundError('Department not found');
    }

    // Update department
    organization.departments[departmentIndex] = {
      ...organization.departments[departmentIndex],
      ...data,
      lastModifiedBy: userId,
      lastModifiedAt: new Date()
    };

    await organization.save();
    return organization;
  }

  /**
   * Delete department
   */
  async deleteDepartment(organizationId, departmentId) {
    const organization = await this.getOrganizationById(organizationId);

    // Check if department has employees
    const hasEmployees = await Employee.exists({
      organization: organizationId,
      'employmentDetails.department': departmentId
    });

    if (hasEmployees) {
      throw new ConflictError('Cannot delete department with assigned employees');
    }

    organization.departments = organization.departments?.filter(
      dept => dept._id.toString() !== departmentId
    );

    await organization.save();
    return organization;
  }

  /**
   * Invite user to organization
   */
  async inviteUser(organizationId, userData, inviterId) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitation = {
      email: userData.email,
      role: userData.role,
      token: invitationToken,
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    // Save invitation
    const organization = await this.getOrganizationById(organizationId);
    organization.invitations = organization.invitations || [];
    organization.invitations.push(invitation);
    await organization.save();

    // Send invitation email
    await this.notificationService.sendInvitationEmail(userData.email, {
      organizationName: organization.name,
      invitationToken,
      role: userData.role
    });

    return invitation;
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(organizationId, startDate, endDate) {
    const query = {
      organization: organizationId
    };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const attendanceRecords = await AttendanceRecord.find(query);

    return {
      total: attendanceRecords.length,
      onTime: attendanceRecords.filter(record => record.isOnTime).length,
      late: attendanceRecords.filter(record => !record.isOnTime).length,
      averageDuration: this.calculateAverageDuration(attendanceRecords)
    };
  }

  /**
   * Calculate average duration between check-in and check-out
   */
  calculateAverageDuration(records) {
    const durations = [];
    const checkIns = new Map();

    records.forEach(record => {
      if (record.type === 'check-in') {
        checkIns.set(record.employee.toString(), record.timestamp);
      } else if (record.type === 'check-out') {
        const checkIn = checkIns.get(record.employee.toString());
        if (checkIn) {
          durations.push(record.timestamp - checkIn);
          checkIns.delete(record.employee.toString());
        }
      }
    });

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Format stats from aggregation
   */
  formatStats(stats) {
    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }
}

module.exports = OrganizationService;