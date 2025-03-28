const crypto = require('crypto');
const mongoose = require('mongoose');
const Invitation = require('../models/invitation.model');
const User = require('../models/user.model');
const Department = require('../models/department.model');
const Organization = require('../models/organization.model');
const { NotFoundError, ConflictError, ForbiddenError, ValidationError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');
const { withOrganizationContext } = require('../utils/query.utils');

class InvitationService {
  constructor(notificationService, auditService) {
    this.notificationService = notificationService;
    this.auditService = auditService;
  }

  /**
   * Send invitation to a user
   * @param {Object} inviteData - Invitation data
   * @param {Object} req - Express request object for audit purposes
   * @returns {Promise<Object>} - Invitation result
   */
  async sendInvitation(inviteData, req) {
    const { email, role, organizationId, inviterId, departmentId, additionalData } = inviteData;

    // Verify organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    const inviter = await User.findById(inviterId);
    if (!inviter) {
      throw new NotFoundError('Inviter not found');
    }

    // Check if inviter has permission for this organization
    if (inviter.role !== 'superadmin' &&
        (!inviter.organization || inviter.organization.toString() !== organizationId.toString())) {
      throw new UnauthorizedError('You do not have permission to invite users to this organization');
    }

    // Check if user already exists in this organization using withOrganizationContext
    const existingUserQuery = withOrganizationContext({ email }, organizationId);
    const existingUser = await User.findOne(existingUserQuery);

    if (existingUser) {
      throw new ConflictError('User with this email already exists in this organization');
    }

    // Check if invitation already exists and is pending for this organization using withOrganizationContext
    const existingInvitationQuery = withOrganizationContext(
        { email, status: 'pending' },
        organizationId
    );

    const existingInvitation = await Invitation.findOne(existingInvitationQuery);

    if (existingInvitation) {
      throw new ConflictError('An invitation has already been sent to this email');
    }

    // Verify department exists if provided using withOrganizationContext
    let department = null;
    if (departmentId) {
      const departmentQuery = withOrganizationContext({ _id: departmentId }, organizationId);
      department = await Department.findOne(departmentQuery);

      if (!department) {
        throw new NotFoundError('Department not found in this organization');
      }
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation with organization context
    const invitation = new Invitation({
      email,
      role,
      token,
      organization: organizationId, // Store as organization for consistency
      departmentId: departmentId || null,
      createdBy: inviterId,
      status: 'pending',
      additionalData: additionalData || {},
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    await invitation.save();

    // Log activity with organization context
    await this.auditService.logActivity({
      action: 'INVITATION_SENT',
      userId: inviterId,
      organizationId,
      resource: 'invitation',
      resourceId: invitation._id,
      details: {
        email,
        role,
        departmentId,
        ip: req?.ip || 'unknown'
      }
    });

    // Send invitation email with organization context
    await this.notificationService.sendInvitationEmail(
        email,
        token,
        {
          role,
          invitedBy: `${inviter.firstName} ${inviter.lastName}`,
          inviterEmail: inviter.email,
          organizationName: organization.name,
          organizationId: organization._id,
          departmentName: department?.name || null,
          isResend: false
        }
    );

    // Return success response
    return {
      success: true,
      message: `Invitation sent to ${email}`,
      user: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        department: department ? {
          id: department._id,
          name: department.name
        } : null
      }
    };
  }

  /**
   * Complete registration from invitation
   * @param {string} token - Invitation token
   * @param {Object} userData - User data for registration
   * @returns {Promise<Object>} - Registration result
   */
  async completeRegistration(token, userData) {
    // Find and validate invitation
    const invitation = await Invitation.findOne({ token, status: 'pending' });

    if (!invitation) {
      throw new NotFoundError('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new ForbiddenError('Invitation has expired');
    }

    const organizationId = invitation.organization || invitation.organizationId;

    // Get additional needed data with organization context
    let department = null;
    if (invitation.departmentId) {
      const departmentQuery = withOrganizationContext(
          { _id: invitation.departmentId },
          organizationId
      );
      department = await Department.findOne(departmentQuery);
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    const { firstName, lastName, password, phone } = userData;

    // Create the user with organization context
    const user = new User({
      email: invitation.email,
      firstName,
      lastName,
      password, // This should be hashed in the User model pre-save hook
      phone: phone || null,
      role: invitation.role,
      organization: organizationId, // Consistent field name
      departmentId: invitation.departmentId,
      status: 'active',
      createdBy: invitation.createdBy,
      metadata: {
        invitationId: invitation._id,
        registeredAt: new Date()
      }
    });

    await user.save();

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    // Log activity with organization context
    await this.auditService.logActivity({
      action: 'REGISTRATION_COMPLETED',
      userId: user._id,
      organizationId,
      resource: 'user',
      resourceId: user._id,
      details: {
        email: user.email,
        role: user.role,
        invitationId: invitation._id
      }
    });

    // Return success response with user details
    return {
      success: true,
      message: 'Registration completed successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: department ? {
          id: department._id,
          name: department.name
        } : null,
        organization: {
          id: organization._id,
          name: organization.name
        }
      }
    };
  }

  /**
   * Resend invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID of the person resending
   * @param {Object} req - Express request object for audit purposes
   * @returns {Promise<Object>} - Resend result
   */
  async resendInvitation(invitationId, userId, req) {
    // Get user for organization context
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const organizationId = user.organization || user.organizationId;

    // Find the invitation within the same organization using withOrganizationContext
    const invitationQuery = withOrganizationContext(
        { _id: invitationId, status: 'pending' },
        organizationId
    );

    const invitation = await Invitation.findOne(invitationQuery);

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    // Get the necessary data for the email
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    let departmentName = null;
    if (invitation.departmentId) {
      // Get department with organization context
      const departmentQuery = withOrganizationContext(
          { _id: invitation.departmentId },
          organizationId
      );
      const department = await Department.findOne(departmentQuery);
      departmentName = department?.name;
    }

    // Generate a new token
    const newToken = crypto.randomBytes(32).toString('hex');
    invitation.token = newToken;

    // Reset expiration date
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await invitation.save();

    // Send invitation email with organization context
    await this.notificationService.sendInvitationEmail(
        invitation.email,
        newToken,
        {
          role: invitation.role,
          invitedBy: `${user.firstName} ${user.lastName}`,
          inviterEmail: user.email,
          organizationName: organization.name,
          organizationId: organization._id,
          departmentName,
          isResend: true
        }
    );

    // Log activity with organization context
    await this.auditService.logActivity({
      action: 'INVITATION_RESENT',
      userId,
      organizationId,
      resource: 'invitation',
      resourceId: invitation._id,
      details: {
        email: invitation.email,
        ip: req?.ip || 'unknown'
      }
    });

    // Return success response
    return {
      success: true,
      message: `Invitation resent to ${invitation.email}`,
      user: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role
      }
    };
  }

  /**
   * Cancel invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID of the person canceling
   * @param {Object} req - Express request object for audit purposes
   * @returns {Promise<Object>} - Cancel result
   */
  async cancelInvitation(invitationId, userId, req) {
    // Get user for organization context
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const organizationId = user.organization || user.organizationId;

    // Find the invitation within the same organization using withOrganizationContext
    const invitationQuery = withOrganizationContext(
        { _id: invitationId, status: 'pending' },
        organizationId
    );

    const invitation = await Invitation.findOne(invitationQuery);

    if (!invitation) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    // Update invitation status
    invitation.status = 'rejected';
    await invitation.save();

    // Log activity with organization context
    await this.auditService.logActivity({
      action: 'INVITATION_CANCELLED',
      userId,
      organizationId,
      resource: 'invitation',
      resourceId: invitation._id,
      details: {
        email: invitation.email,
        ip: req?.ip || 'unknown'
      }
    });

    // Return success response
    return {
      success: true,
      message: `Invitation canceled for ${invitation.email}`
    };
  }

  /**
   * List invitations
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters (role, status)
   * @returns {Promise<Object>} - List of invitations
   */
  async listInvitations(organizationId, filters = {}) {
    const { role, status = 'pending' } = filters;

    logger.info(`Building query for invitations: org=${organizationId}, role=${role}, status=${status}`);

    // Build the query with proper ObjectId handling
    const query = { status };

    // Use $or to match either field name (organization or organizationId)
    if (organizationId) {
      query.$or = [
        { organization: new mongoose.Types.ObjectId(organizationId) },
        { organizationId: new mongoose.Types.ObjectId(organizationId) }
      ];
    }

    if (role) {
      query.role = role;
    }

    logger.info(`Executing invitation query: ${JSON.stringify(query)}`);

    // Find invitations
    const invitations = await Invitation.find(query)
        .populate('departmentId', 'name')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .exec();

    logger.info(`Retrieved ${invitations.length} invitation records`);

    // Format the response
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      department: invitation.departmentId ? {
        id: invitation.departmentId._id,
        name: invitation.departmentId.name
      } : null,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      createdBy: invitation.createdBy ? {
        id: invitation.createdBy._id,
        firstName: invitation.createdBy.firstName,
        lastName: invitation.createdBy.lastName,
        email: invitation.createdBy.email
      } : null
    }));

    return {
      success: true,
      invitations: formattedInvitations
    };
  }
}

module.exports = InvitationService;