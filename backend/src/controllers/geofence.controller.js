// src/controllers/geofence.controller.js
const GeofenceService = require('../services/geofence.service');
const { validateGeofence } = require('../utils/validation');
const logger = require('../utils/logger');

const geofenceService = new GeofenceService();

const geofenceController = {
  /**
   * Create a new geofence
   */
  async createGeofence(req, res, next) {
    try {
      const validationResult = validateGeofence(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      const { organizationId } = req.user;
      const geofence = await geofenceService.createGeofence({
        ...req.body,
        organizationId
      });
      
      logger.info(`Created geofence: ${geofence._id}`);
      res.status(201).json(geofence);
    } catch (error) {
      logger.error(`Failed to create geofence: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get all geofences for an organization
   */
  async getGeofences(req, res, next) {
    try {
      const { organizationId } = req.user;
      const { page = 1, limit = 10, status } = req.query;
      
      const geofences = await geofenceService.getGeofences(
        organizationId,
        { page, limit, status }
      );
      
      logger.info(`Retrieved geofences for organization: ${organizationId}`);
      res.json(geofences);
    } catch (error) {
      logger.error(`Failed to get geofences: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get specific geofence details
   */
  async getGeofence(req, res, next) {
    try {
      const { id } = req.params; // Changed from geofenceId to id to match route parameter
      const geofence = await geofenceService.getGeofenceById(id);
      
      logger.info(`Retrieved geofence: ${id}`);
      res.json(geofence);
    } catch (error) {
      logger.error(`Failed to get geofence: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update geofence
   */
  async updateGeofence(req, res, next) {
    try {
      const { id } = req.params; // Changed from geofenceId to id to match route parameter
      const validationResult = validateGeofence(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      const updatedGeofence = await geofenceService.updateGeofence(
        id,
        req.body
      );
      
      logger.info(`Updated geofence: ${id}`);
      res.json(updatedGeofence);
    } catch (error) {
      logger.error(`Failed to update geofence: ${error.message}`);
      next(error);
    }
  },

  /**
   * Delete geofence
   */
  async deleteGeofence(req, res, next) {
    try {
      const { id } = req.params; // Changed from geofenceId to id to match route parameter
      await geofenceService.deleteGeofence(id);
      
      logger.info(`Deleted geofence: ${id}`);
      res.json({ message: 'Geofence deleted successfully' });
    } catch (error) {
      logger.error(`Failed to delete geofence: ${error.message}`);
      next(error);
    }
  },

  /**
   * Assign employees to geofence
   */
  async assignEmployees(req, res, next) {
    try {
      const { id } = req.params; // Changed from geofenceId to id to match route parameter
      const { employeeIds } = req.body;
      
      const result = await geofenceService.assignEmployeesToGeofence(
        id,
        employeeIds
      );
      
      logger.info(`Assigned employees to geofence: ${id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to assign employees: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get geofence activity logs
   */
  async getGeofenceActivity(req, res, next) {
    try {
      const { id } = req.params; // Changed from geofenceId to id to match route parameter
      const { startDate, endDate, employeeId } = req.query;
      
      const activity = await geofenceService.getGeofenceActivity(
        id,
        { startDate, endDate, employeeId }
      );
      
      logger.info(`Retrieved activity for geofence: ${id}`);
      res.json(activity);
    } catch (error) {
      logger.error(`Failed to get geofence activity: ${error.message}`);
      next(error);
    }
  },

  /**
   * Check if coordinates are within geofence
   */
  async checkLocation(req, res, next) {
    try {
      const { latitude, longitude } = req.body;
      
      const result = await geofenceService.checkLocationInGeofence(
        req.user.organizationId,
        { latitude, longitude }
      );
      
      logger.info(`Checked location for organization: ${req.user.organizationId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to check location: ${error.message}`);
      next(error);
    }
  },

  /**
   * Generate geofence reports
   */
  async generateReports(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate, type } = req.query;
      
      const report = await geofenceService.generateGeofenceReport(
        id,
        { startDate, endDate, type }
      );
      
      logger.info(`Generated report for geofence: ${id}`);
      res.json(report);
    } catch (error) {
      logger.error(`Failed to generate report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update geofence schedule
   */
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const schedule = req.body;
      
      const updatedGeofence = await geofenceService.updateGeofenceSchedule(
        id,
        schedule
      );
      
      logger.info(`Updated schedule for geofence: ${id}`);
      res.json(updatedGeofence);
    } catch (error) {
      logger.error(`Failed to update schedule: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get nearby geofences
   */
  getNearbyGeofences: async (req, res, next) => {
    try {
        const { latitude, longitude, radius = 1000 } = req.query;
      
      const nearbyGeofences = await geofenceService.getNearbyGeofences(
        req.user.organizationId,
        { latitude, longitude, radius }
      );
      
      logger.info(`Retrieved nearby geofences for coordinates: ${latitude}, ${longitude}`);
      res.json(nearbyGeofences);
    } catch (error) {
      logger.error(`Failed to get nearby geofences: ${error.message}`);
      next(error);
    }
  },

  /**
   * Remove employee from geofence
   */
  async removeEmployee(req, res, next) {
    try {
      const { id, employeeId } = req.params;
      
      await geofenceService.removeEmployeeFromGeofence(
        id,
        employeeId
      );
      
      logger.info(`Removed employee ${employeeId} from geofence: ${id}`);
      res.json({ message: 'Employee removed from geofence successfully' });
    } catch (error) {
      logger.error(`Failed to remove employee: ${error.message}`);
      next(error);
    }
  }
};

module.exports = geofenceController;