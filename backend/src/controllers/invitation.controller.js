const InvitationService = require('../services/invitation.service');
const NotificationService = require('../services/notification.service');
const AuditService = require('../services/audit.service');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

// Required models
const Invitation = require('../models/invitation.model');
const Organization = require('../models/organization.model');
const Employee = require('../models/employee.model');

// Required services
const EmployeeService = require('../services/employee.service');

class InvitationController {
  constructor() {
    const notificationService = new NotificationService();
    const auditService = new AuditService();
    this.invitationService = new InvitationService(notificationService, auditService);
    this.employeeService = new EmployeeService();
    logger.info('InvitationController initialized');
  }

  /**
   * Invite a user (admin, manager, or employee)
   */
  async inviteUser(req, res, next) {
    try {
      const { userId } = req.user;
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required for sending invitations'
        });
      }

      const { email, role, departmentId, additionalData } = req.body;

      logger.info(`Processing invitation request for ${email} with role ${role} in organization ${organizationId}`);

      const result = await this.invitationService.sendInvitation({
        email,
        role,
        organizationId,
        inviterId: userId,
        departmentId,
        additionalData
      }, req);

      logger.info(`${role} invitation sent to ${email} by user ${userId} for organization ${organizationId}`);
      res.status(201).json(result);
    } catch (error) {
      logger.error(`Invitation failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Complete registration from invitation
   * This is a public endpoint that doesn't need tenant isolation
   */
  async completeRegistration(req, res, next) {
    try {
      const { token, firstName, lastName, password, phone, passportPhoto } = req.body;

      logger.info(`Processing registration completion for token: ${token.substring(0, 10)}...`);

      // Step 1: Complete the user registration
      const result = await this.invitationService.completeRegistration(
          token,
          { firstName, lastName, password, phone }
      );

      logger.info(`Registration completed for token: ${token.substring(0, 10)}...`);

      // Step 2: Fetch the full organization details to ensure we have the uniqueId
      const organization = await Organization.findById(result.user.organization.id);

      if (organization) {
        // Update the organization info in the result to include uniqueId
        result.user.organization = {
          id: organization._id,
          name: organization.name,
          uniqueId: organization.uniqueId || null
        };
      }

      // Step 3: Automatically create an employee record
      try {
        // Retrieve the invitation to get additional data
        const invitation = await Invitation.findOne({
          token,
          status: 'accepted'
        });

        if (!invitation) {
          throw new Error('Could not find the accepted invitation');
        }

        // Get the user from the database
        const User = require('../models/user.model');
        const user = await User.findById(result.user.id);

        if (!user) {
          throw new Error('Could not find the registered user');
        }

        // Get employment details from invitation additionalData
        const employmentDetails = invitation.additionalData?.employmentDetails || {};

        // Create a proper employee data object that matches the required schema
        const employeeData = {
          // Note: We don't pass the password again as the user is already created
          email: invitation.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organization: user.organization, // Pass the MongoDB ObjectId directly

          // Only include relevant fields for addEmployee
          personalInfo: {
            phone: phone || null
          },

          employmentDetails: {
            department: employmentDetails.department || result.user.department?.name || 'General',
            position: employmentDetails.position || 'Employee',
            employmentType: employmentDetails.employmentType || 'full-time',
            startDate: employmentDetails.startDate || new Date().toISOString().split('T')[0]
          },

          // The admin who created the invitation
          createdBy: invitation.createdBy
        };

        // Create the employee record - IMPORTANT: Don't include password here
        // We need to modify the addEmployee method to handle cases where the user already exists
        const modifiedEmployeeService = Object.create(this.employeeService);
        modifiedEmployeeService.addEmployee = async function(data) {
          // Skip user creation since the user already exists
          // Create employee record directly
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
          return employee;
        };

        // Create the employee record
        const employee = await modifiedEmployeeService.addEmployee(employeeData);

        logger.info(`Employee record created for user: ${result.user.id}`);

        // Add employee info to the result
        result.employee = {
          id: employee._id,
          employeeId: employee.employeeId,
          status: employee.status
        };

      } catch (employeeError) {
        // Log the error but don't fail the registration
        logger.error(`Failed to create employee record: ${employeeError.message}`);
        result.employeeCreationError = employeeError.message;
      }

      // Return the final result with organization uniqueId and employee info
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
      const { userId } = req.user;
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { invitationId } = req.params;

      logger.info(`Resending invitation ${invitationId} by user ${userId} for organization ${organizationId}`);

      // First check if invitation belongs to this organization
      const invitation = await Invitation.findOne({
        _id: invitationId,
        organizationId
      });

      if (!invitation && !(req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin')) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found in this organization'
        });
      }

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
      const { userId } = req.user;
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const { invitationId } = req.params;

      // First check if invitation belongs to this organization
      const invitation = await Invitation.findOne({
        _id: invitationId,
        organizationId
      });

      if (!invitation && !(req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin')) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found in this organization'
        });
      }

      logger.info(`Canceling invitation ${invitationId} by user ${userId} for organization ${organizationId}`);

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
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      if (!organizationId) {
        // For platform admins, optionally allow listing across all organizations
        if (req.user.role === 'platform_admin' || req.user.role === 'platform_superadmin') {
          // Could implement cross-organization invitation listing here
          // For now, require an organization context
          return res.status(400).json({
            success: false,
            message: 'Organization context is required'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Organization context is required'
          });
        }
      }

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

// module.exports = new InvitationController();

module.exports = InvitationController;