const twilio = require('twilio');
const nodemailer = require('nodemailer');
const firebase = require('firebase-admin');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
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
      if (config.twilio.accountSid && config.twilio.authToken) {
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
      if (config.email.host && config.email.port) {
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
      if (config.firebase.credentials) {
        firebase.initializeApp({
          credential: firebase.credential.cert(config.firebase.credentials)
        });
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
   */
  async sendNotification(userId, type, data) {
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
   */
  async sendEmail(email, type, data) {
    if (!this.emailTransporter) {
      throw new ServiceError('Email service not configured');
    }

    try {
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
   */
  async sendSMS(phoneNumber, type, data) {
    if (!this.smsClient) {
      throw new ServiceError('SMS service not configured');
    }

    try {
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
   */
  async sendPushNotification(deviceTokens, type, data) {
    if (!this.fcm) {
      throw new ServiceError('Push notification service not configured');
    }

    try {
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
        
        // Could implement token cleanup here if needed
        // await this.removeFailedTokens(failedTokens);
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
  
  async notifyGeofenceEntry(employeeId, geofenceId) {
    const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
    const geofence = await Geofence.findById(geofenceId);

    // Notify employee
    await this.sendNotification(employeeId, 'geofence_entry', {
      geofenceName: geofence.name,
      timestamp: new Date().toISOString()
    });

    // Notify supervisor if configured
    if (employee.employmentDetails?.supervisor) {
      await this.sendNotification(
        employee.employmentDetails.supervisor._id,
        'employee_geofence_entry',
        {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          geofenceName: geofence.name,
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  async notifyGeofenceExit(employeeId, geofenceId) {
    const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
    const geofence = await Geofence.findById(geofenceId);

    // Notify employee
    await this.sendNotification(employeeId, 'geofence_exit', {
      geofenceName: geofence.name,
      timestamp: new Date().toISOString()
    });

    // Notify supervisor if configured
    if (employee.employmentDetails?.supervisor) {
      await this.sendNotification(
        employee.employmentDetails.supervisor._id,
        'employee_geofence_exit',
        {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          geofenceName: geofence.name,
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  async sendWelcomeEmail(email, data) {
    return this.sendEmail(email, 'welcome', data);
  }

  async notifyLeaveRequest(supervisorId, data) {
    return this.sendNotification(supervisorId, 'leave_request', {
      employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
      startDate: data.leave.startDate,
      endDate: data.leave.endDate,
      reason: data.leave.reason
    });
  }

  async sendPasswordResetEmail(email, resetToken) {
    return this.sendEmail(email, 'password_reset', {
      resetToken,
      resetUrl: `${config.frontendUrl}/reset-password?token=${resetToken}`
    });
  }

  async notifyLateCheckIn(employeeId, geofenceId, scheduledTime) {
    const employee = await User.findById(employeeId).populate('employmentDetails.supervisor');
    const geofence = await Geofence.findById(geofenceId);

    if (employee.employmentDetails?.supervisor) {
      await this.sendNotification(
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
  }

  async sendSubscriptionExpiryReminder(organizationId) {
    const organization = await Organization.findById(organizationId);
    const adminUsers = await User.find({
      organization: organizationId,
      role: 'admin'
    });

    for (const admin of adminUsers) {
      await this.sendNotification(admin._id, 'subscription_expiry', {
        organizationName: organization.name,
        expiryDate: organization.subscription.expiryDate.toISOString(),
        daysRemaining: Math.ceil(
          (organization.subscription.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
        )
      });
    }
  }
}

module.exports = NotificationService;