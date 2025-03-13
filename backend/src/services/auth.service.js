const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const { UnauthorizedError, NotFoundError } = require('../utils/errors');
const config = require('../config/env');
// const config = require('../config/auth');
// const NotificationService = require('./notification.service');



class NotificationService {
  async sendVerificationEmail(email, token) {
    console.log(`[STUB] Sending verification email to ${email} with token ${token}`);
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

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // Start transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Step 1: Create organization
      const organization = new Organization({
        ...organizationData,
        subscription: planData,
        status: 'active',
        metadata: {
          employeeCount: 0,
          geofenceCount: 0,
          createdBy: null, // Temporary placeholder
        },
      });

      // Step 2: Create admin with organization reference
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      const admin = new User({
        ...adminData,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        organization: organization._id,
      });

      // Step 3: Set createdBy to admin._id
      organization.metadata.createdBy = admin._id;

      // Step 4: Save both within the transaction
      console.log('Saving organization and admin in transaction...');
      await organization.save({ session });
      await admin.save({ session });

      // Step 5: Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');

      // Step 6: Generate verification token and send email (outside transaction)
      const verificationToken = this.generateVerificationToken();
      await this.notificationService.sendVerificationEmail(admin.email, verificationToken);

      // Step 7: Generate auth tokens (outside transaction)
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
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if 2FA is required
    if (user.security.mfaEnabled) {
      const tempToken = await this.generateTempToken(user);
      return { requiresMfa: true, tempToken };
    }

    // Generate tokens
    const tokens = await this.generateAuthTokens(user);

    // Record login
    await user.recordLogin(
      this.getClientIp(),
      this.getClientUserAgent()
    );

    return { user: { ...user.toJSON(), password: undefined }, tokens };
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
      // Don't reveal user existence
      return;
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await this.notificationService.sendPasswordResetEmail(
      email,
      resetToken
    );
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

    user.password = await bcrypt.hash(newPassword, 12);
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
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
      const user = await User.findById(decoded.userId);

      if (!user || !user.tokens.find(t => t.token === refreshToken)) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Remove old refresh token
      user.tokens = user.tokens.filter(t => t.token !== refreshToken);
      
      // Generate new tokens
      const tokens = await this.generateAuthTokens(user);
      await user.save();

      return tokens;
    } catch (error) {
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

    // Remove refresh token
    user.tokens = user.tokens.filter(t => t.token !== refreshToken);
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

  // async generateAuthTokens(user) {
  //   const accessToken = jwt.sign(
  //     {
  //       userId: user._id,
  //       organizationId: user.organization,
  //       role: user.role
  //     },
  //     config.jwtSecret,
  //     { expiresIn: config.jwtExpiresIn }
  //   );

  //   const refreshToken = jwt.sign(
  //     { userId: user._id },
  //     config.jwtRefreshSecret,
  //     { expiresIn: config.jwtRefreshExpiresIn }
  //   );

  //   // Save refresh token
  //   user.tokens.push({
  //     token: refreshToken,
  //     type: 'refresh',
  //     expiresAt: new Date(Date.now() + config.jwtRefreshExpiresIn * 1000)
  //   });
  //   await user.save();

  //   return { accessToken, refreshToken };
  // }

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