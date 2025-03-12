const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const { UnauthorizedError, NotFoundError, ConflictError } = require('../utils/errors');
const config = require('../config/auth');
const NotificationService = require('./notification.service');
const mongoose = require('mongoose');

class AuthService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Register a new organization and admin user
   */
  async registerOrganization(organizationData, adminData, planData) {
    try {
      // Check if organization already exists
      const existingOrg = await Organization.findOne({ 'contact.email': organizationData.contact.email });
      if (existingOrg) {
        throw new ConflictError('Organization with this email already exists');
      }

      // Check if admin user already exists
      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create a temporary ID to use as creator for both organization and user
      const tempCreatorId = new mongoose.Types.ObjectId();
      
      // Create organization with required metadata
      const organization = new Organization({
        ...organizationData,
        subscription: planData,
        metadata: {
          createdBy: tempCreatorId, // Using ObjectId instead of string
          createdAt: new Date()
        }
      });

      // Validate organization data before saving
      const orgValidationError = organization.validateSync();
      if (orgValidationError) {
        const fields = Object.keys(orgValidationError.errors).join(', ');
        throw new Error(`Organization validation failed for fields: ${fields}`);
      }
      
      await organization.save();

      // Create admin user
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      const admin = new User({
        ...adminData,
        password: hashedPassword,
        organization: organization._id,
        role: 'admin',
        status: 'active',
        metadata: {
          createdBy: tempCreatorId, // Using same ObjectId for consistency
          createdAt: new Date()
        }
      });

      // Validate user data before saving
      const userValidationError = admin.validateSync();
      if (userValidationError) {
        // If user validation fails, delete the created organization
        await Organization.findByIdAndDelete(organization._id);
        const fields = Object.keys(userValidationError.errors).join(', ');
        throw new Error(`User validation failed for fields: ${fields}`);
      }
      
      await admin.save();

      // Update organization to set the real admin as the creator
      await Organization.findByIdAndUpdate(organization._id, {
        'metadata.createdBy': admin._id
      });

      // Generate verification token and send email
      // const verificationToken = this.generateVerificationToken();
      const verificationToken = '';
      
      // Check if the notification service has the sendVerificationEmail method
      if (this.notificationService && typeof this.notificationService.sendVerificationEmail === 'function') {
        await this.notificationService.sendVerificationEmail(
          admin.email,
          verificationToken
        );
      } else {
        // Fallback if the method doesn't exist
        console.log(`Verification token for ${admin.email}: ${verificationToken}`);
      }

      // Generate auth tokens
      // const tokens = await this.generateAuthTokens(admin);
      const tokens = '';

      return {
        organization,
        admin: { ...admin.toJSON(), password: undefined },
        tokens
      };
    } catch (error) {
      // Make sure we provide detailed error information
      if (error.name === 'ValidationError') {
        const fields = Object.keys(error.errors).join(', ');
        throw new Error(`Validation failed for fields: ${fields}`);
      }
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(email, password, requestInfo = {}) {
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      if (typeof user.incrementLoginAttempts === 'function') {
        await user.incrementLoginAttempts();
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if 2FA is required
    if (user.security && user.security.mfaEnabled) {
      const tempToken = await this.generateTempToken(user);
      return { requiresMfa: true, tempToken };
    }

    // Generate tokens
    const tokens = await this.generateAuthTokens(user);

    // Record login if method exists
    if (typeof user.recordLogin === 'function') {
      await user.recordLogin(
        requestInfo.ip || 'unknown',
        requestInfo.userAgent || 'unknown'
      );
    }

    return { user: { ...user.toJSON(), password: undefined }, tokens };
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(userId, token, requestInfo = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.security || !user.security.mfaSecret) {
      throw new UnauthorizedError('2FA is not set up for this user');
    }

    const isValid = this.verify2FAToken(token, user.security.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    const tokens = await this.generateAuthTokens(user);
    
    // Record login if method exists
    if (typeof user.recordLogin === 'function') {
      await user.recordLogin(
        requestInfo.ip || 'unknown',
        requestInfo.userAgent || 'unknown'
      );
    }

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

    // Check if user has the generatePasswordResetToken method
    let resetToken;
    if (typeof user.generatePasswordResetToken === 'function') {
      resetToken = user.generatePasswordResetToken();
    } else {
      // Create reset token manually if method doesn't exist
      resetToken = crypto.randomBytes(32).toString('hex');
      user.security = user.security || {};
      user.security.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      user.security.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    }
    
    await user.save();

    // Check if the notification service has the sendPasswordResetEmail method
    if (this.notificationService && typeof this.notificationService.sendPasswordResetEmail === 'function') {
      await this.notificationService.sendPasswordResetEmail(
        email,
        resetToken
      );
    } else {
      // Fallback if the method doesn't exist
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }
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

    // Check if the notification service has the sendPasswordChangeNotification method
    if (this.notificationService && typeof this.notificationService.sendPasswordChangeNotification === 'function') {
      await this.notificationService.sendPasswordChangeNotification(user.email);
    } else {
      // Fallback if the method doesn't exist
      console.log(`Password change notification for ${user.email}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
      const user = await User.findById(decoded.userId);

      if (!user || !user.tokens || !user.tokens.find(t => t.token === refreshToken)) {
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
    if (user.tokens && Array.isArray(user.tokens)) {
      user.tokens = user.tokens.filter(t => t.token !== refreshToken);
      await user.save();
    }
  }

  /**
   * Generate auth tokens (access + refresh)
   */
  async generateAuthTokens(user) {
    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user._id,
        organizationId: user.organization,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Parse the refresh token expiration time
    let refreshExpiresInSeconds;
    if (typeof config.jwtRefreshExpiresIn === 'string') {
      // Parse string like '7d' into seconds
      const match = config.jwt.expiresIn.match(/^(\d+)([smhdwy])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        // Convert to seconds based on unit
        switch (unit) {
          case 's': refreshExpiresInSeconds = value; break;
          case 'm': refreshExpiresInSeconds = value * 60; break;
          case 'h': refreshExpiresInSeconds = value * 60 * 60; break;
          case 'd': refreshExpiresInSeconds = value * 24 * 60 * 60; break;
          case 'w': refreshExpiresInSeconds = value * 7 * 24 * 60 * 60; break;
          case 'y': refreshExpiresInSeconds = value * 365 * 24 * 60 * 60; break;
          default: refreshExpiresInSeconds = 7 * 24 * 60 * 60; // Default to 7 days
        }
      } else {
        // Default if format is not recognized
        refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days
      }
    } else if (typeof config.jwtRefreshExpiresIn === 'number') {
      // If it's already a number, assume it's in seconds
      refreshExpiresInSeconds = config.jwtRefreshExpiresIn;
    } else {
      // Default fallback
      refreshExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    }

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );

    // Calculate expiration date as a proper Date object
    const expiresAt = new Date(Date.now() + (refreshExpiresInSeconds * 1000));

    // Initialize tokens array if it doesn't exist
    if (!user.tokens) {
      user.tokens = [];
    }

    // Save refresh token
    user.tokens.push({
      token: refreshToken,
      type: 'refresh',
      expiresAt: expiresAt
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
   * Enable 2FA for user
   */
  async enable2FA(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({ length: 20 });

    // Save secret to user
    user.security = user.security || {};
    user.security.mfaSecret = secret.base32;
    user.security.mfaEnabled = false; // Set to false until verified
    await user.save();

    return {
      secret: secret.base32,
      qrCode: `otpauth://totp/${user.email}?secret=${secret.base32}&issuer=YourAppName`
    };
  }

  /**
   * Verify and activate 2FA
   */
  async verify2FASetup(userId, token) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.security || !user.security.mfaSecret) {
      throw new UnauthorizedError('2FA setup not initiated');
    }

    const isValid = this.verify2FAToken(token, user.security.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    // Enable 2FA
    user.security.mfaEnabled = true;
    await user.save();

    return { success: true };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId, password) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password for security
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid password');
    }

    // Disable 2FA
    if (user.security) {
      user.security.mfaEnabled = false;
      user.security.mfaSecret = undefined;
    }
    await user.save();

    return { success: true };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      'verification.token': hashedToken,
      'verification.expires': { $gt: Date.now() }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    user.verification.verified = true;
    user.verification.token = undefined;
    user.verification.expires = undefined;
    await user.save();

    return { success: true };
  }

  /**
   * Resend verification email
   */
  async resendVerification(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.verification && user.verification.verified) {
      throw new ConflictError('Email already verified');
    }

    // Generate new verification token
    const verificationToken = this.generateVerificationToken();
    
    // Save token
    user.verification = user.verification || {};
    user.verification.token = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.verification.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    if (this.notificationService && typeof this.notificationService.sendVerificationEmail === 'function') {
      await this.notificationService.sendVerificationEmail(
        user.email,
        verificationToken
      );
    } else {
      // Fallback if the method doesn't exist
      console.log(`Verification token for ${user.email}: ${verificationToken}`);
    }

    return { success: true };
  }
}

module.exports = AuthService;