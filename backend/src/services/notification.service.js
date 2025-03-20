const twilio = require('twilio');
const nodemailer = require('nodemailer');
const firebase = require('firebase-admin');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const Geofence = require('../models/geofence.model');
const config = require('../config/notification');
const logger = require('../utils/logger');
const { ServiceError } = require('../utils/errors');
const emailTemplates = require('../templates/email');
const smsTemplates = require('../templates/sms');
const pushTemplates = require('../templates/push');
const { withOrganizationContext } = require('../utils/query.utils');

class NotificationService {
  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize notification services with error handling
   */
  initializeServices() {
    // Initialize Twilio
    try {
      if (config.twilio && config.twilio.accountSid && config.twilio.authToken) {
        this.smsClient = twilio(config.twilio.accountSid, config.twilio.authToken);
        logger.info('Twilio SMS service initialized');
      } else {
        logger.warn('Twilio credentials not provided. SMS functionality will be disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio:', error);
      this.smsClient = null;
    }

    // Initialize Email
    try {
      if (config.email && config.email.host && config.email.port) {
        this.emailTransporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.user,
            pass: config.email.password
          }
        });
        logger.info('Email service initialized');
      } else {
        logger.warn('Email credentials not provided. Email functionality will be disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.emailTransporter = null;
    }

    // Initialize Firebase for push notifications
    try {
      if (config.firebase && config.firebase.credentials) {
        if (!firebase.apps.length) {
          firebase.initializeApp({
            credential: firebase.credential.cert(config.firebase.credentials)
          });
        }
        this.fcm = firebase.messaging();
        logger.info('Firebase push notification service initialized');
      } else {
        logger.warn('Firebase credentials not provided. Push notification functionality will be disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      this.fcm = null;
    }
  }

  /**
   * Send notification through multiple channels
   * @param {string} userId - User ID to notify
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {string} organizationId - Optional organization ID for context
   */
  async sendMultiChannelNotification(userId, type, data, organizationId = null) {
    try {
      // Apply organization context to query if provided
      const query = organizationId ?
          withOrganizationContext({ _id: userId }, organizationId) :
          { _id: userId };

      const user = await User.findOne(query);

      if (!user) {
        logger.warn(`Attempted to send notification to non-existent user: ${userId}`);
        return;
      }

      // Get organization with context
      const userOrgId = user.organization || user.organizationId;
      const organization = await Organization.findById(userOrgId);

      const preferences = user.preferences?.notifications || {};
      const orgPreferences = organization?.settings?.notificationPreferences || {};

      const promises = [];

      // Queue email notification if enabled
      if (preferences.email && orgPreferences.email && this.emailTransporter) {
        promises.push(this.sendEmail(user.email, type, {
          ...data,
          organizationId: userOrgId // Include organization context
        }).catch(error => {
          logger.error('Email notification failed:', error);
          return null;
        }));
      }

      // Queue SMS notification if enabled
      if (preferences.sms && orgPreferences.sms && user.profile?.phone && this.smsClient) {
        promises.push(this.sendSMS(user.profile.phone, type, {
          ...data,
          organizationId: userOrgId // Include organization context
        }).catch(error => {
          logger.error('SMS notification failed:', error);
          return null;
        }));
      }

      // Queue push notification if enabled
      if (preferences.push && orgPreferences.push && user.deviceTokens?.length && this.fcm) {
        promises.push(this.sendPushNotification(user.deviceTokens, type, {
          ...data,
          organizationId: userOrgId // Include organization context
        }).catch(error => {
          logger.error('Push notification failed:', error);
          return null;
        }));
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(promises);

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Notification channel ${index} failed:`, result.reason);
        }
      });

      return results.some(result => result.status === 'fulfilled');
    } catch (error) {
      logger.error('Failed to send notifications:', error);
      throw new ServiceError('Failed to send notifications');
    }
  }

  /**
   * Send email notification
   * @param {string} email - Email address
   * @param {string} type - Template type
   * @param {Object} data - Template data
   */
  async sendEmail(email, type, data) {
    if (!this.emailTransporter) {
      // Use fallback behavior instead of throwing error to prevent breaking workflows
      logger.warn('Email service not configured, using fallback behavior');
      logger.info(`[FALLBACK EMAIL] Type: ${type}, To: ${email}, Data:`, data);
      return { success: true, fallback: true };
    }

    try {
      // Check if template exists
      if (!emailTemplates || !emailTemplates[type]) {
        logger.warn(`Email template not found for type: ${type}, using fallback`);
        logger.info(`[FALLBACK EMAIL] To: ${email}, Subject: Notification, Data:`, data);
        return { success: true, fallback: true };
      }

      const template = emailTemplates[type](data);

      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: template.subject,
        html: template.html
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${email}`, { type, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${email}:`, error);
      throw new ServiceError('Failed to send email');
    }
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Phone number
   * @param {string} type - Template type
   * @param {Object} data - Template data
   */
  async sendSMS(phoneNumber, type, data) {
    if (!this.smsClient) {
      // Use fallback behavior instead of throwing error
      logger.warn('SMS service not configured, using fallback behavior');
      logger.info(`[FALLBACK SMS] Type: ${type}, To: ${phoneNumber}, Data:`, data);
      return { success: true, fallback: true };
    }

    try {
      // Check if template exists
      if (!smsTemplates || !smsTemplates[type]) {
        logger.warn(`SMS template not found for type: ${type}, using fallback`);
        logger.info(`[FALLBACK SMS] To: ${phoneNumber}, Data:`, data);
        return { success: true, fallback: true };
      }

      const message = smsTemplates[type](data);

      const result = await this.smsClient.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phoneNumber
      });

      logger.info(`SMS sent successfully to ${phoneNumber}`, { type, messageId: result.sid });
      return result;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw new ServiceError('Failed to send SMS');
    }
  }

  /**
   * Send push notification
   * @param {string[]} deviceTokens - Device tokens
   * @param {string} type - Template type
   * @param {Object} data - Template data
   */
  async sendPushNotification(deviceTokens, type, data) {
    if (!this.fcm) {
      // Use fallback behavior instead of throwing error
      logger.warn('Push notification service not configured, using fallback behavior');
      logger.info(`[FALLBACK PUSH] Type: ${type}, Tokens: ${deviceTokens.length}, Data:`, data);
      return { success: true, fallback: true };
    }

    try {
      // Check if template exists
      if (!pushTemplates || !pushTemplates[type]) {
        logger.warn(`Push template not found for type: ${type}, using fallback`);
        logger.info(`[FALLBACK PUSH] Tokens: ${deviceTokens.length}, Data:`, data);
        return { success: true, fallback: true };
      }

      const notification = pushTemplates[type](data);

      const message = {
        notification,
        data: {
          type,
          ...data
        },
        tokens: deviceTokens
      };

      const result = await this.fcm.sendMulticast(message);

      logger.info('Push notifications sent', {
        type,
        successful: result.successCount,
        failed: result.failureCount
      });

      // Handle failed tokens
      if (result.failureCount > 0) {
        const failedTokens = [];
        result.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(deviceTokens[idx]);
          }
        });

        logger.warn('Failed to send to some devices', { failedTokens });
      }

      return result;
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      throw new ServiceError('Failed to send push notifications');
    }
  }

  /**
   * Notification type specific methods
   */

  /**
   * Notify when employee enters geofence
   * @param {string} employeeId - Employee ID
   * @param {string} geofenceId - Geofence ID
   * @param {string} organizationId - Optional organization ID for context
   */
  async notifyGeofenceEntry(employeeId, geofenceId, organizationId = null) {
    try {
      // Apply organization context to queries if provided
      const employeeQuery = organizationId ?
          withOrganizationContext({ _id: employeeId }, organizationId) :
          { _id: employeeId };

      const geofenceQuery = organizationId ?
          withOrganizationContext({ _id: geofenceId }, organizationId) :
          { _id: geofenceId };

      const employee = await User.findOne(employeeQuery).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findOne(geofenceQuery);

      if (!employee || !geofence) {
        logger.warn('Cannot notify geofence entry: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      // Use the organization from the employee or geofence
      const contextOrgId = organizationId || employee.organization || geofence.organization;

      // Notify employee
      await this.sendMultiChannelNotification(employeeId, 'geofence_entry', {
        geofenceName: geofence.name,
        timestamp: new Date().toISOString()
      }, contextOrgId);

      // Notify supervisor if configured
      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
            employee.employmentDetails.supervisor._id,
            'employee_geofence_entry',
            {
              employeeName: `${employee.firstName} ${employee.lastName}`,
              geofenceName: geofence.name,
              timestamp: new Date().toISOString()
            },
            contextOrgId
        );
      }
    } catch (error) {
      logger.error('Failed to notify geofence entry:', error);
    }
  }

  /**
   * Notify when employee exits geofence
   * @param {string} employeeId - Employee ID
   * @param {string} geofenceId - Geofence ID
   * @param {string} organizationId - Optional organization ID for context
   */
  async notifyGeofenceExit(employeeId, geofenceId, organizationId = null) {
    try {
      // Apply organization context to queries if provided
      const employeeQuery = organizationId ?
          withOrganizationContext({ _id: employeeId }, organizationId) :
          { _id: employeeId };

      const geofenceQuery = organizationId ?
          withOrganizationContext({ _id: geofenceId }, organizationId) :
          { _id: geofenceId };

      const employee = await User.findOne(employeeQuery).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findOne(geofenceQuery);

      if (!employee || !geofence) {
        logger.warn('Cannot notify geofence exit: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      // Use the organization from the employee or geofence
      const contextOrgId = organizationId || employee.organization || geofence.organization;

      // Notify employee
      await this.sendMultiChannelNotification(employeeId, 'geofence_exit', {
        geofenceName: geofence.name,
        timestamp: new Date().toISOString()
      }, contextOrgId);

      // Notify supervisor if configured
      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
            employee.employmentDetails.supervisor._id,
            'employee_geofence_exit',
            {
              employeeName: `${employee.firstName} ${employee.lastName}`,
              geofenceName: geofence.name,
              timestamp: new Date().toISOString()
            },
            contextOrgId
        );
      }
    } catch (error) {
      logger.error('Failed to notify geofence exit:', error);
    }
  }

  /**
   * Send welcome email to new user
   * @param {string} email - User email
   * @param {Object} data - Email data
   * @param {string} organizationId - Optional organization ID for context
   */
  async sendWelcomeEmail(email, data, organizationId = null) {
    try {
      logger.info(`Sending welcome email to ${email}`);

      // Add organization context to data if available
      const emailData = organizationId ?
          { ...data, organizationId } :
          data;

      return await this.sendEmail(email, 'welcome', emailData);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw - welcome emails should not block registration flow
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for leave request
   * @param {string} supervisorId - Supervisor ID
   * @param {Object} data - Notification data
   */
  async notifyLeaveRequest(supervisorId, data) {
    try {
      // Extract organization context from data if available
      const organizationId = data.organization || data.organizationId;

      return await this.sendMultiChannelNotification(
          supervisorId,
          'leave_request',
          {
            employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
            startDate: data.leave.startDate,
            endDate: data.leave.endDate,
            reason: data.leave.reason
          },
          organizationId
      );
    } catch (error) {
      logger.error('Failed to notify leave request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} resetToken - Password reset token
   * @param {string} organizationId - Optional organization ID for context
   */
  async sendPasswordResetEmail(email, resetToken, organizationId = null) {
    try {
      if (!config.frontendUrl) {
        logger.warn('Frontend URL not configured, using fallback for reset link');
        logger.info(`Password reset token for ${email}: ${resetToken}`);
        return { success: true, fallback: true };
      }

      // Add organization context to data if available
      const emailData = organizationId ?
          {
            resetToken,
            resetUrl: `${config.frontendUrl}/reset-password?token=${resetToken}`,
            organizationId
          } :
          {
            resetToken,
            resetUrl: `${config.frontendUrl}/reset-password?token=${resetToken}`
          };

      return await this.sendEmail(email, 'password_reset', emailData);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      // Log token so it's not lost but don't throw error to avoid revealing user existence
      logger.info(`[FALLBACK] Password reset token for ${email}: ${resetToken}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify supervisor of employee late check-in
   * @param {string} employeeId - Employee ID
   * @param {string} geofenceId - Geofence ID
   * @param {Date} scheduledTime - Scheduled check-in time
   * @param {string} organizationId - Optional organization ID for context
   */
  async notifyLateCheckIn(employeeId, geofenceId, scheduledTime, organizationId = null) {
    try {
      // Apply organization context to queries if provided
      const employeeQuery = organizationId ?
          withOrganizationContext({ _id: employeeId }, organizationId) :
          { _id: employeeId };

      const geofenceQuery = organizationId ?
          withOrganizationContext({ _id: geofenceId }, organizationId) :
          { _id: geofenceId };

      const employee = await User.findOne(employeeQuery).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findOne(geofenceQuery);

      if (!employee || !geofence) {
        logger.warn('Cannot notify late check-in: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      // Use the organization from the employee or geofence
      const contextOrgId = organizationId || employee.organization || geofence.organization;

      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
            employee.employmentDetails.supervisor._id,
            'late_check_in',
            {
              employeeName: `${employee.firstName} ${employee.lastName}`,
              geofenceName: geofence.name,
              scheduledTime: scheduledTime.toISOString(),
              currentTime: new Date().toISOString()
            },
            contextOrgId
        );
      }
    } catch (error) {
      logger.error('Failed to notify late check-in:', error);
    }
  }

  /**
   * Send subscription expiry reminder to org admins
   * @param {string} organizationId - Organization ID
   */
  async sendSubscriptionExpiryReminder(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization || !organization.subscription?.expiryDate) {
        logger.warn('Cannot send subscription expiry reminder: Organization or expiry date not found', { organizationId });
        return;
      }

      // Apply organization context to query
      const adminQuery = withOrganizationContext(
          { role: 'admin' },
          organizationId
      );

      const adminUsers = await User.find(adminQuery);

      if (!adminUsers.length) {
        logger.warn('No admin users found for organization', { organizationId });
        return;
      }

      const daysRemaining = Math.ceil(
          (new Date(organization.subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      for (const admin of adminUsers) {
        await this.sendMultiChannelNotification(
            admin._id,
            'subscription_expiry',
            {
              organizationName: organization.name,
              expiryDate: organization.subscription.expiryDate.toISOString(),
              daysRemaining
            },
            organizationId
        );
      }
    } catch (error) {
      logger.error('Failed to send subscription expiry reminder:', error);
    }
  }

  /**
   * Send verification email to user
   * @param {string} email - User email
   * @param {string} token - Verification token
   * @param {string} organizationId - Optional organization ID for context
   */
  async sendVerificationEmail(email, token, organizationId = null) {
    try {
      if (!config.frontendUrl) {
        logger.warn('Frontend URL not configured, using fallback for verification link');
        logger.info(`Email verification token for ${email}: ${token}`);
        return { success: true, fallback: true };
      }

      // Add organization context to data if available
      const emailData = organizationId ?
          {
            verificationToken: token,
            verificationUrl: `${config.frontendUrl}/verify-email?token=${token}`,
            organizationId
          } :
          {
            verificationToken: token,
            verificationUrl: `${config.frontendUrl}/verify-email?token=${token}`
          };

      return await this.sendEmail(email, 'email_verification', emailData);
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
      // Log token so it's not lost, but don't block registration process
      logger.info(`[FALLBACK] Email verification token for ${email}: ${token}`);
      return { success: true, fallback: true };
    }
  }

  /**
   * Send password change notification
   * @param {string} email - User email
   * @param {string} organizationId - Optional organization ID for context
   */
  async sendPasswordChangeNotification(email, organizationId = null) {
    try {
      // Add organization context to data if available
      const emailData = organizationId ?
          {
            timestamp: new Date().toISOString(),
            organizationId
          } :
          {
            timestamp: new Date().toISOString()
          };

      return await this.sendEmail(email, 'password_changed', emailData);
    } catch (error) {
      logger.error(`Failed to send password change notification to ${email}:`, error);
      logger.info(`[FALLBACK] Password change notification sent to ${email}`);
      return { success: true, fallback: true };
    }
  }

  /**
   * Send invitation email to new user
   * @param {string} email - Recipient email
   * @param {string} token - Invitation token
   * @param {Object} data - Email data
   * @returns {Promise<Object>} - Result of email operation
   */
  async sendInvitationEmail(email, token, data) {
    try {
      const {
        role,
        invitedBy,
        inviterEmail,
        organizationName,
        organizationId,
        departmentName,
        isResend
      } = data;

      logger.info(`Sending ${role} invitation email to ${email}`);

      // Different registration URL based on role
      const frontendUrl = config.frontendUrl || 'http://localhost:3000';
      const registrationUrl = role === 'admin'
          ? `${frontendUrl}/admin/complete-registration?token=${token}`
          : `${frontendUrl}/employee/complete-registration?token=${token}`;

      // If email service is not configured, use mock/log behavior
      if (!this.emailTransporter || process.env.NODE_ENV !== 'production') {
        logger.info(`[MOCK] Invitation token: ${token}`);
        logger.info(`[MOCK] You have been invited by ${invitedBy} (${inviterEmail}) to join ${organizationName} as a ${role}`);

        if (departmentName) {
          logger.info(`[MOCK] Department: ${departmentName}`);
        }

        if (isResend) {
          logger.info(`[MOCK] This is a reminder for a previous invitation.`);
        }

        logger.info(`[MOCK] Registration URL: ${registrationUrl}`);
        return { success: true, fallback: true };
      }

      // If we have email configured and in production, send real email
      // Here we can use the existing email templates system or create a dedicated one
      // For now we'll use a direct approach:

      const subject = isResend
          ? `Reminder: Invitation to join ${organizationName}`
          : `Invitation to join ${organizationName}`;

      const htmlContent = `
      <h2>You've been invited to join ${organizationName}</h2>
      <p>Hello,</p>
      <p>You have been invited by ${invitedBy} (${inviterEmail}) to join ${organizationName} as a ${role}.</p>
      ${departmentName ? `<p>Department: ${departmentName}</p>` : ''}
      ${isResend ? `<p><strong>This is a reminder for a previous invitation.</strong></p>` : ''}
      <p>To complete your registration, please click the following link:</p>
      <p><a href="${registrationUrl}">${registrationUrl}</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>Thank you,<br>${organizationName} Team</p>
    `;

      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: subject,
        html: htmlContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Invitation email sent successfully to ${email}`, { messageId: result.messageId });
      return result;

    } catch (error) {
      logger.error(`Failed to send invitation email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

}

module.exports = NotificationService;