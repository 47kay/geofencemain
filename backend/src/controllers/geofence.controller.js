// controllers/geofence.controller.js
const GeofenceService = require('../services/geofence.service');
const { validateGeofence } = require('../utils/validation');
const logger = require('../utils/logger');

class GeofenceController {
  constructor() {
    this.geofenceService = new GeofenceService();
  }

  /**
   * Create a new geofence
   */
  async createGeofence(req, res, next) {
    try {
      const validationResult = validateGeofence(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const userId = req.user._id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const geofence = await this.geofenceService.createGeofence({
        ...req.body,
        organizationId,
        userId,
        assignAllEmployees: req.body.assignAllEmployees === true
      });

      logger.info(`Created geofence: ${geofence._id} for organization: ${organizationId}`);
      res.status(201).json(geofence);
    } catch (error) {
      logger.error(`Failed to create geofence: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get all geofences for an organization
   */
  async getGeofences(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // Handle platform admins differently
      if (!organizationId) {
        if (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin') {
          // For platform admins, get geofences across all orgs if requested
          const allOrgs = req.query.allOrganizations === 'true';
          if (allOrgs) {
            const { page = 1, limit = 10, status } = req.query;
            const geofences = await this.geofenceService.getAllGeofences({ page, limit, status });
            logger.info(`Platform admin retrieved geofences across all organizations`);
            return res.json(geofences);
          } else {
            return res.status(400).json({
              success: false,
              message: 'Organization context is required or specify allOrganizations=true'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Organization context is required'
          });
        }
      }

      const { page = 1, limit = 10, status, type } = req.query;

      const result = await this.geofenceService.getGeofences(
          organizationId,
          { page, limit, status, type }
      );

      logger.info(`Retrieved geofences for organization: ${organizationId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to get geofences: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get specific geofence details
   */
  async getGeofence(req, res, next) {
    try {
      const { id } = req.params;
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // Get the geofence (service will handle organization filtering)
      let geofence;

      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (organizationId || !isCrossPlatformAdmin) {
        // With organization context, ensure tenant isolation
        geofence = await this.geofenceService.getGeofenceById(id, organizationId);
      } else {
        // Platform admins can access any geofence
        geofence = await this.geofenceService.getGeofenceById(id);
        // Log cross-organization access
        logger.info(`Platform admin accessed geofence: ${id}`);
      }

      logger.info(`Retrieved geofence: ${id}`);
      res.json(geofence);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to get geofence: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update geofence
   */
  async updateGeofence(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      // Apply validation
      const validationResult = validateGeofence(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const updatedGeofence = await this.geofenceService.updateGeofence(
          id,
          {
            ...req.body,
            userId
          },
          orgContext
      );

      logger.info(`Updated geofence: ${id}`);
      res.json(updatedGeofence);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to update geofence: ${error.message}`);
      next(error);
    }
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(req, res, next) {
    try {
      const { id } = req.params;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const result = await this.geofenceService.deleteGeofence(id, orgContext);

      logger.info(`Deleted geofence: ${id}`);
      res.json(result);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to delete geofence: ${error.message}`);
      next(error);
    }
  }

  /**
   * Assign employees to geofence
   */
  async assignEmployees(req, res, next) {
    try {
      const { id } = req.params;
      const { employeeIds } = req.body;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const geofence = await this.geofenceService.assignEmployeesToGeofence(
          id,
          employeeIds,
          orgContext
      );

      logger.info(`Assigned employees to geofence: ${id}`);
      res.json(geofence);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to assign employees: ${error.message}`);
      next(error);
    }
  }

  /**
   * Remove employee from geofence
   */
  async removeEmployee(req, res, next) {
    try {
      const { id, employeeId } = req.params;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const geofence = await this.geofenceService.removeEmployeeFromGeofence(
          id,
          employeeId,
          orgContext
      );

      logger.info(`Removed employee ${employeeId} from geofence: ${id}`);
      res.json({ success: true, message: 'Employee removed from geofence successfully' });
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to remove employee: ${error.message}`);
      next(error);
    }
  }

  /**
   * Check if coordinates are within geofence
   */
  async checkLocation(req, res, next) {
    try {
      const { latitude, longitude } = req.body;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const result = await this.geofenceService.checkLocationInGeofence(
          organizationId,
          { latitude, longitude }
      );

      logger.info(`Checked location for organization: ${organizationId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to check location: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get nearby geofences
   */
  async getNearbyGeofences(req, res, next) {
    try {
      const { latitude, longitude, radius = 1000 } = req.query;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const nearbyGeofences = await this.geofenceService.getNearbyGeofences(
          organizationId,
          { latitude, longitude, radius }
      );

      logger.info(`Retrieved nearby geofences for coordinates: ${latitude}, ${longitude}`);
      res.json(nearbyGeofences);
    } catch (error) {
      logger.error(`Failed to get nearby geofences: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get geofence activity logs
   */
  async getGeofenceActivity(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate, employeeId, page, limit } = req.query;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const activity = await this.geofenceService.getGeofenceActivity(
          id,
          { startDate, endDate, employeeId, page, limit },
          orgContext
      );

      logger.info(`Retrieved activity for geofence: ${id}`);
      res.json(activity);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to get geofence activity: ${error.message}`);
      next(error);
    }
  }

  /**
   * Generate geofence reports
   */
  async generateReport(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate, type = 'summary' } = req.query;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const report = await this.geofenceService.generateGeofenceReport(
          id,
          { startDate, endDate, type },
          orgContext
      );

      logger.info(`Generated report for geofence: ${id}`);
      res.json(report);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to generate report: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update geofence schedule
   */
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = req.body;

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;
      const isCrossPlatformAdmin = req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin';

      if (!organizationId && !isCrossPlatformAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      // For platform admins, don't apply organization context
      const orgContext = isCrossPlatformAdmin ? null : organizationId;

      const updatedGeofence = await this.geofenceService.updateGeofenceSchedule(
          id,
          schedule,
          orgContext
      );

      logger.info(`Updated schedule for geofence: ${id}`);
      res.json(updatedGeofence);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return res.status(404).json({ message: error.message });
      }
      logger.error(`Failed to update schedule: ${error.message}`);
      next(error);
    }
  }
}

module.exports = GeofenceController;