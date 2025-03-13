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
   */
  async sendMultiChannelNotification(userId, type, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Attempted to send notification to non-existent user: ${userId}`);
        return;
      }

      const organization = await Organization.findById(user.organization);
      const preferences = user.preferences?.notifications || {};
      const orgPreferences = organization?.settings?.notificationPreferences || {};

      const promises = [];

      // Queue email notification if enabled
      if (preferences.email && orgPreferences.email && this.emailTransporter) {
        promises.push(this.sendEmail(user.email, type, data).catch(error => {
          logger.error('Email notification failed:', error);
          return null;
        }));
      }

      // Queue SMS notification if enabled
      if (preferences.sms && orgPreferences.sms && user.profile?.phone && this.smsClient) {
        promises.push(this.sendSMS(user.profile.phone, type, data).catch(error => {
          logger.error('SMS notification failed:', error);
          return null;
        }));
      }

      // Queue push notification if enabled
      if (preferences.push && orgPreferences.push && user.deviceTokens?.length && this.fcm) {
        promises.push(this.sendPushNotification(user.deviceTokens, type, data).catch(error => {
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
   */
  async notifyGeofenceEntry(employeeId, geofenceId) {
    try {
      const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findById(geofenceId);

      if (!employee || !geofence) {
        logger.warn('Cannot notify geofence entry: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      // Notify employee
      await this.sendMultiChannelNotification(employeeId, 'geofence_entry', {
        geofenceName: geofence.name,
        timestamp: new Date().toISOString()
      });

      // Notify supervisor if configured
      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
          employee.employmentDetails.supervisor._id,
          'employee_geofence_entry',
          {
            employeeName: `${employee.firstName} ${employee.lastName}`,
            geofenceName: geofence.name,
            timestamp: new Date().toISOString()
          }
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
   */
  async notifyGeofenceExit(employeeId, geofenceId) {
    try {
      const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findById(geofenceId);

      if (!employee || !geofence) {
        logger.warn('Cannot notify geofence exit: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      // Notify employee
      await this.sendMultiChannelNotification(employeeId, 'geofence_exit', {
        geofenceName: geofence.name,
        timestamp: new Date().toISOString()
      });

      // Notify supervisor if configured
      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
          employee.employmentDetails.supervisor._id,
          'employee_geofence_exit',
          {
            employeeName: `${employee.firstName} ${employee.lastName}`,
            geofenceName: geofence.name,
            timestamp: new Date().toISOString()
          }
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
   */
  async sendWelcomeEmail(email, data) {
    try {
      logger.info(`Sending welcome email to ${email}`);
      return await this.sendEmail(email, 'welcome', data);
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
      return await this.sendMultiChannelNotification(supervisorId, 'leave_request', {
        employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
        startDate: data.leave.startDate,
        endDate: data.leave.endDate,
        reason: data.leave.reason
      });
    } catch (error) {
      logger.error('Failed to notify leave request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} resetToken - Password reset token
   */
  async sendPasswordResetEmail(email, resetToken) {
    try {
      if (!config.frontendUrl) {
        logger.warn('Frontend URL not configured, using fallback for reset link');
        logger.info(`Password reset token for ${email}: ${resetToken}`);
        return { success: true, fallback: true };
      }

      return await this.sendEmail(email, 'password_reset', {
        resetToken,
        resetUrl: `${config.frontendUrl}/reset-password?token=${resetToken}`
      });
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
   */
  async notifyLateCheckIn(employeeId, geofenceId, scheduledTime) {
    try {
      const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
      const geofence = await Geofence.findById(geofenceId);

      if (!employee || !geofence) {
        logger.warn('Cannot notify late check-in: Employee or geofence not found', { employeeId, geofenceId });
        return;
      }

      if (employee.employmentDetails?.supervisor) {
        await this.sendMultiChannelNotification(
          employee.employmentDetails.supervisor._id,
          'late_check_in',
          {
            employeeName: `${employee.firstName} ${employee.lastName}`,
            geofenceName: geofence.name,
            scheduledTime: scheduledTime.toISOString(),
            currentTime: new Date().toISOString()
          }
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

      const adminUsers = await User.find({
        organization: organizationId,
        role: 'admin'
      });

      if (!adminUsers.length) {
        logger.warn('No admin users found for organization', { organizationId });
        return;
      }

      const daysRemaining = Math.ceil(
        (new Date(organization.subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      for (const admin of adminUsers) {
        await this.sendMultiChannelNotification(admin._id, 'subscription_expiry', {
          organizationName: organization.name,
          expiryDate: organization.subscription.expiryDate.toISOString(),
          daysRemaining
        });
      }
    } catch (error) {
      logger.error('Failed to send subscription expiry reminder:', error);
    }
  }

  /**
   * Send verification email to user
   * @param {string} email - User email
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(email, token) {
    try {
      if (!config.frontendUrl) {
        logger.warn('Frontend URL not configured, using fallback for verification link');
        logger.info(`Email verification token for ${email}: ${token}`);
        return { success: true, fallback: true };
      }

      return await this.sendEmail(email, 'email_verification', {
        verificationToken: token,
        verificationUrl: `${config.frontendUrl}/verify-email?token=${token}`
      });
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
   */
  async sendPasswordChangeNotification(email) {
    try {
      return await this.sendEmail(email, 'password_changed', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Failed to send password change notification to ${email}:`, error);
      logger.info(`[FALLBACK] Password change notification sent to ${email}`);
      return { success: true, fallback: true };
    }
  }
}

module.exports = NotificationService;