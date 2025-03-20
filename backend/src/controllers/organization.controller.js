const OrganizationService = require('../services/organization.service');
const logger = require('../utils/logger');
const { ForbiddenError } = require('../utils/errors');

/**
 * Organization controller for handling HTTP requests
 */
class OrganizationController {
  constructor() {
    // Create a new instance of the organization service
    this.organizationService = new OrganizationService();
  }

  /**
   * Get organization details
   */
  async getOrganization(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user is trying to access an organization they don't belong to
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to access org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this organization'
        });
      }

      const organization = await this.organizationService.getOrganizationById(organizationId);

      logger.info(`Retrieved organization: ${organizationId}`);
      res.json(organization);
    } catch (error) {
      logger.error(`Failed to get organization: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to update this organization
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to update org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this organization'
        });
      }

      const updatedOrg = await this.organizationService.updateOrganization(
          organizationId,
          req.body,
          req.user.userId // Using userId from the JWT payload
      );

      logger.info(`Updated organization: ${organizationId}`);
      res.json(updatedOrg);
    } catch (error) {
      logger.error(`Failed to update organization: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get organization statistics
   */
  async getStatistics(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to access this organization's statistics
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to access stats for org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access statistics for this organization'
        });
      }

      const { startDate, endDate } = req.query;

      const stats = await this.organizationService.getOrganizationStats(
          organizationId,
          startDate,
          endDate
      );

      logger.info(`Retrieved statistics for organization: ${organizationId}`);
      res.json(stats);
    } catch (error) {
      logger.error(`Failed to get organization statistics: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get organization activity logs
   */
  async getActivityLogs(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to access this organization's logs
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to access logs for org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access logs for this organization'
        });
      }

      const { page = 1, limit = 10, type } = req.query;

      const logs = await this.organizationService.getActivityLogs(
          organizationId,
          { page, limit, type }
      );

      logger.info(`Retrieved activity logs for organization: ${organizationId}`);
      res.json(logs);
    } catch (error) {
      logger.error(`Failed to get activity logs: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to update this organization's settings
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to update settings for org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update settings for this organization'
        });
      }

      const { settings } = req.body;

      const updatedSettings = await this.organizationService.updateSettings(
          organizationId,
          settings,
          req.user.userId
      );

      logger.info(`Updated settings for organization: ${organizationId}`);
      res.json(updatedSettings);
    } catch (error) {
      logger.error(`Failed to update settings: ${error.message}`);
      next(error);
    }
  }

  /**
   * Add department
   */
  async addDepartment(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to add departments to this organization
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to add department to org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add departments to this organization'
        });
      }

      const department = await this.organizationService.addDepartment(
          organizationId,
          req.body,
          req.user.userId
      );

      logger.info(`Added department to organization: ${organizationId}`);
      res.status(201).json(department);
    } catch (error) {
      logger.error(`Failed to add department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update department
   */
  async updateDepartment(req, res, next) {
    try {
      const { organizationId, departmentId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to update departments in this organization
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to update department in org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update departments in this organization'
        });
      }

      const department = await this.organizationService.updateDepartment(
          organizationId,
          departmentId,
          req.body,
          req.user.userId
      );

      logger.info(`Updated department: ${departmentId} in organization: ${organizationId}`);
      res.json(department);
    } catch (error) {
      logger.error(`Failed to update department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Delete department
   */
  async deleteDepartment(req, res, next) {
    try {
      const { organizationId, departmentId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to delete departments in this organization
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to delete department in org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete departments in this organization'
        });
      }

      await this.organizationService.deleteDepartment(organizationId, departmentId);

      logger.info(`Deleted department: ${departmentId} from organization: ${organizationId}`);
      res.json({ message: 'Department deleted successfully' });
    } catch (error) {
      logger.error(`Failed to delete department: ${error.message}`);
      next(error);
    }
  }

  /**
   * Invite user to organization
   */
  async inviteUser(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userOrgContext = req.organizationContext;

      // Check if user has permission to invite users to this organization
      if (userOrgContext &&
          organizationId !== userOrgContext &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
        logger.warn(`User from org ${userOrgContext} attempted to invite user to org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to invite users to this organization'
        });
      }

      const invitation = await this.organizationService.inviteUser(
          organizationId,
          req.body,
          req.user.userId
      );

      logger.info(`Invited user to organization: ${organizationId}`);
      res.status(201).json(invitation);
    } catch (error) {
      logger.error(`Failed to invite user: ${error.message}`);
      next(error);
    }
  }
}

// Export a new instance of the controller
module.exports = new OrganizationController();