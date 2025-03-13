const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const config = require('../config/env');
const logger = require('../utils/logger');
// const config = require('../config/auth');
// const NotificationService = require('./notification.service');



class NotificationService {
  async sendVerificationEmail(email, token) {
    console.log(`[MOCK] Sending verification email to ${email} with token ${token}`);
  }
  async sendPasswordResetEmail(email, token) {
    console.log(`[MOCK] Sending password reset email to ${email} with token ${token}`);
  }
  async sendPasswordChangeNotification(email) {
    console.log(`[MOCK] Sending password change notification to ${email}`);
  }
}

class AuthService {
  constructor() {
    this.notificationService = new NotificationService();
  }


  async registerOrganization(organizationData, adminData, planData) {
    let session;
    try {
      console.log('Starting registerOrganization with transaction...');

      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      session = await mongoose.startSession();
      session.startTransaction();

      const organization = new Organization({
        ...organizationData,
        subscription: planData,
        status: 'active',
        metadata: {
          employeeCount: 0,
          geofenceCount: 0,
          createdBy: null,
        },
      });

      logger.info('Register - Password before saving: ' + adminData.password); // Debug
      const admin = new User({
        ...adminData, // password is plain text here
        role: 'admin',
        status: 'active',
        organization: organization._id,
      });

      organization.metadata.createdBy = admin._id;

      console.log('Saving organization and admin in transaction...');
      await organization.save({ session });
      await admin.save({ session }); // pre('save') hook hashes password

      await session.commitTransaction();
      console.log('Transaction committed successfully');

      // Verify saved hash
      const savedUser = await User.findOne({ email: adminData.email });
      logger.info('Register - Saved hash: ' + savedUser.password); // Debug
      const isValid = await bcrypt.compare(adminData.password, savedUser.password);
      logger.info('Register - Hash verification: ' + isValid); // Debug

      const verificationToken = this.generateVerificationToken();
      await this.notificationService.sendVerificationEmail(admin.email, verificationToken);

      const tokens = await this.generateAuthTokens(admin);

      return {
        organization,
        admin: { ...admin.toJSON(), password: undefined },
        tokens,
      };
    } catch (error) {
      console.error('Error in registerOrganization:', error);
      if (session && session.transaction.isActive) {
        await session.abortTransaction();
      }
      throw new Error(error.message === 'A user with this email already exists' 
        ? error.message 
        : `Failed to register organization: ${error.message}`);
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
  

  

  /**
   * Authenticate user and generate tokens
   */

 
  async login(email, password) {
    logger.info('Login - Called with email: ' + email);
    const user = await User.findOne({ email });
    logger.info('Login - User retrieved: ' + (user ? user.email : 'null'));
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    logger.info('Login - Stored password hash: ' + user.password); // Debug
    const isPasswordValid = await bcrypt.compare(password, user.password);
    logger.info('Login - Password valid: ' + isPasswordValid + ' for input: ' + password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const tokens = await this.generateAuthTokens(user);
    logger.info('Login - Tokens generated for email: ' + user.email);
    return tokens;
  }

 
  /**
   * Verify 2FA token
   */
  async verify2FA(userId, token) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = this.verify2FAToken(token, user.security.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    const tokens = await this.generateAuthTokens(user);
    await user.recordLogin(
      this.getClientIp(),
      this.getClientUserAgent()
    );

    return { user: user.toJSON(), tokens };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return; // Silent failure
    }
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    logger.info(`Reset token generated for ${email}: ${resetToken}`); // Extra debug
    await this.notificationService.sendPasswordResetEmail(email, resetToken);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    const user = await User.findOne({
      'security.passwordResetToken': hashedToken,
      'security.passwordResetExpires': { $gt: Date.now() }
    });
    if (!user) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
    user.password = newPassword; // pre('save') hook will hash it
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();
    await this.notificationService.sendPasswordChangeNotification(user.email);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      logger.info(`Refreshing token: ${refreshToken.substring(0, 10)}...`); // Partial for brevity
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      logger.info(`Token decoded: userId=${decoded.userId}`);
      const user = await User.findById(decoded.userId);
      if (!user) {
        logger.info(`User not found for userId: ${decoded.userId}`);
        throw new UnauthorizedError('Invalid refresh token');
      }
  
      const tokenExists = user.tokens.find(t => t.token === refreshToken);
      logger.info(`Token exists in DB: ${!!tokenExists}`);
      if (!tokenExists) {
        throw new UnauthorizedError('Invalid refresh token');
      }
  
      // Remove old refresh token
      user.tokens = user.tokens.filter(t => t.token !== refreshToken);
      const tokens = await this.generateAuthTokens(user);
      await user.save();
  
      logger.info('New tokens generated');
      return tokens;
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
  /**
   * Logout user
   */
  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (refreshToken) {
      user.tokens = user.tokens.filter(t => t.token !== refreshToken);
      logger.info('Refresh token removed for user: ' + userId);
    } else {
      logger.info('No refresh token provided, logging out user: ' + userId);
    }
    await user.save();
  }


  /**
   * Generate auth tokens (access + refresh)
   */


  async generateAuthTokens(user) {
    console.log('JWT Config in generateAuthTokens:', config.jwt); // Debug log
    if (!config.jwt.secret || !config.jwt.refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessToken = jwt.sign(
      { userId: user._id, organizationId: user.organization, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    user.tokens = user.tokens || [];
    user.tokens.push({
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await user.save();

    return { accessToken, refreshToken };
  }

 

  /**
   * Generate temporary token for 2FA
   */
  async generateTempToken(user) {
    return jwt.sign(
      { userId: user._id, temp: true },
      config.jwtSecret,
      { expiresIn: '5m' }
    );
  }

  /**
   * Generate email verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify 2FA token
   */
  verify2FAToken(token, secret) {
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });
  }

  /**
   * Get client IP
   */
  getClientIp() {
    // Implementation depends on your setup
    return req.ip || req.connection.remoteAddress;
  }

  /**
   * Get client user agent
   */
  getClientUserAgent() {
    return req.headers['user-agent'];
  }
}

module.exports = AuthService;