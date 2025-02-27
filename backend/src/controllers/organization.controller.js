const OrganizationService = require('../services/organization.service');
const logger = require('../utils/logger');

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
      const updatedOrg = await this.organizationService.updateOrganization(
        organizationId,
        req.body,
        req.user.id
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
      const { settings } = req.body;
      
      const updatedSettings = await this.organizationService.updateSettings(
        organizationId,
        settings,
        req.user.id
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
      const department = await this.organizationService.addDepartment(
        organizationId,
        req.body,
        req.user.id
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
      const department = await this.organizationService.updateDepartment(
        organizationId,
        departmentId,
        req.body,
        req.user.id
      );
      
      logger.info(`Updated department: ${departmentId}`);
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
      await this.organizationService.deleteDepartment(organizationId, departmentId);
      
      logger.info(`Deleted department: ${departmentId}`);
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
      const invitation = await this.organizationService.inviteUser(
        organizationId,
        req.body,
        req.user.id
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