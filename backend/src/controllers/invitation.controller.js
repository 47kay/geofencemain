const InvitationService = require('../services/invitation.service');
const NotificationService = require('../services/notification.service');
const AuditService = require('../services/audit.service');
const logger = require('../utils/logger');

class InvitationController {
  constructor() {
    const notificationService = new NotificationService();
    const auditService = new AuditService();
    this.invitationService = new InvitationService(notificationService, auditService);
    logger.info('InvitationController initialized');
  }

  /**
   * Invite a user (admin, manager, or employee)
   */
  async inviteUser(req, res, next) {
    try {
      const { userId, organizationId } = req.user; // From auth middleware
      const { email, role, departmentId, additionalData } = req.body;
      
      logger.info(`Processing invitation request for ${email} with role ${role}`);
      
      const result = await this.invitationService.sendInvitation({
        email,
        role,
        organizationId,
        inviterId: userId,
        departmentId,
        additionalData
      }, req);
      
      logger.info(`${role} invitation sent to ${email} by user ${userId}`);
      res.status(201).json(result);
    } catch (error) {
      logger.error(`Invitation failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Complete registration from invitation
   */
  async completeRegistration(req, res, next) {
    try {
      const { token, firstName, lastName, password, phone } = req.body;
      
      logger.info(`Processing registration completion for token: ${token.substring(0, 10)}...`);
      
      const result = await this.invitationService.completeRegistration(
        token,
        { firstName, lastName, password, phone }
      );
      
      logger.info(`Registration completed for token: ${token.substring(0, 10)}...`);
      res.json(result);
    } catch (error) {
      logger.error(`Complete registration failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(req, res, next) {
    try {
      const { userId, organizationId } = req.user; // From auth middleware
      const { invitationId } = req.params;
      
      logger.info(`Resending invitation ${invitationId} by user ${userId}`);
      
      const result = await this.invitationService.resendInvitation(
        invitationId,
        userId,
        req
      );
      
      logger.info(`Invitation ${invitationId} resent by user ${userId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Resend invitation failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(req, res, next) {
    try {
      const { userId, organizationId } = req.user; // From auth middleware
      const { invitationId } = req.params;
      
      logger.info(`Canceling invitation ${invitationId} by user ${userId}`);
      
      const result = await this.invitationService.cancelInvitation(
        invitationId,
        userId,
        req
      );
      
      logger.info(`Invitation ${invitationId} canceled by user ${userId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Cancel invitation failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * List pending invitations
   */
  async listInvitations(req, res, next) {
    try {
      const { userId, organizationId } = req.user;
      const { role, status } = req.query;
      
      logger.info(`Listing invitations for organization ${organizationId}, filters: ${JSON.stringify({ role, status })}`);
      
      const result = await this.invitationService.listInvitations(
        organizationId,
        { role, status }
      );
      
      res.json(result);
    } catch (error) {
      logger.error(`List invitations failed: ${error.message}`);
      next(error);
    }
  }
}

module.exports = InvitationController;