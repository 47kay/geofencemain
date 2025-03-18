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
  async sendVerificationEmail(email, code) {
    console.log(`[MOCK] Sending verification email to ${email}`);
    console.log(`[MOCK] Your verification code is: ${code}`);
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
      logger.info('Starting registration for email: ' + adminData.email);
  
      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        logger.info('Registration failed: Email already exists: ' + adminData.email);
        throw new Error('A user with this email already exists');
      }
  
      // Generate a 4-digit verification code
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      logger.info('Generated verification code for ' + adminData.email);
      
      // Hash the verification code
      const hashedCode = crypto
        .createHash('sha256')
        .update(verificationCode)
        .digest('hex');
      
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
  
      logger.info('Creating user with pending status for email: ' + adminData.email);
      const admin = new User({
        ...adminData,
        role: 'superadmin',
        status: 'pending', // Set status to pending until verification
        organization: organization._id,
        verification: {
          code: hashedCode,
          expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
          verified: false
        }
      });
  
      organization.metadata.createdBy = admin._id;
  
      logger.info('Saving organization and admin in transaction...');
      await organization.save({ session });
      await admin.save({ session });
  
      await session.commitTransaction();
      logger.info('Transaction committed successfully for: ' + adminData.email);
  
      // Send verification code to user's email
      await this.notificationService.sendVerificationEmail(admin.email, verificationCode);
      logger.info('Verification code sent to: ' + adminData.email);
  
      // Return data without tokens - tokens will be provided after verification
      return {
        success: true,
        organization: organization,
        
        admin: { ...admin.toJSON(), password: undefined },
        message: "Registration initiated. Please verify your email with the code sent."
      };
    } catch (error) {
      logger.error('Error in registerOrganization:', error);
      if (session && session.transaction.isActive) {
        await session.abortTransaction();
        logger.info('Transaction aborted due to error');
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


 
  // async login(email, password) {
  //   logger.info('Login - Called with email: ' + email);
  //   const user = await User.findOne({ email });
  //   logger.info('Login - User retrieved: ' + (user ? user.email : 'null'));
  //
  //   if (!user) {
  //     throw new UnauthorizedError('Invalid email or password');
  //   }
  //   logger.info('Login - Stored password hash: ' + user.password); // Debug
  //   const isPasswordValid = await bcrypt.compare(password, user.password);
  //   logger.info('Login - Password valid: ' + isPasswordValid + ' for input: ' + password);
  //   if (!isPasswordValid) {
  //
  //     throw new UnauthorizedError('Invalid email or password');
  //
  //   }
  //   const tokens = await this.generateAuthTokens(user);
  //
  //   logger.info('Login - Tokens generated for email: ' + user.email);
  //   return {
  //     access_token: tokens.accessToken,
  //     refresh_token: tokens.refreshToken,
  //     expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
  //     token_type: "Bearer"
  //   };
  //
  // }

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

    // Check if this is a platform admin role
    const isPlatformAdmin = user.role && user.role.startsWith('platform_');

    logger.info('Login - Tokens generated for email: ' + user.email);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
      token_type: "Bearer",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        // Only include organization for non-platform admins
        ...(isPlatformAdmin ? {} : { organization: user.organization })
      }
    };
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
  
  // Save the user with updated password
  await user.save();
  
  // Send notification after successful save
  await this.notificationService.sendPasswordChangeNotification(user.email);
  
  return { success: true };
}

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }
      
      logger.info(`Refreshing token: ${refreshToken.substring(0, 10)}...`);
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
      
      // Format response according to OpenAPI spec
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
        token_type: "Bearer"
      };
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
  
  // Helper method to parse expiration time to seconds
  getExpirationSeconds(expiresIn) {
    if (typeof expiresIn === 'number') return expiresIn;
    
    const match = expiresIn.match(/^(\d+)([smhdwy])$/);
    if (!match) return 3600; // Default to 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      case 'w': return value * 7 * 24 * 60 * 60;
      case 'y': return value * 365 * 24 * 60 * 60;
      default: return 3600;
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

    // Check if user is a platform admin (role starts with 'platform_')
    const isPlatformAdmin = user.role && user.role.startsWith('platform_');

    // For platform admins, organizationId can be null
    // For regular users, we must include their organization
    const accessToken = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          // Only include organizationId for non-platform roles
          ...(isPlatformAdmin ? {} : { organizationId: user.organization })
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
  
  // If user was in pending status, activate them
  if (user.status === 'pending') {
    user.status = 'active';
  }
  
  await user.save();

  return { success: true };
}

/**
 * Resend verification code
 */
async resendVerification(email) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.verification && user.verification.verified) {
    throw new Error('Email already verified');
  }

  // Generate a new 4-digit verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Hash the verification code
  const hashedCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');
  
  // Update verification data
  user.verification = user.verification || {};
  user.verification.code = hashedCode;
  user.verification.expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  await user.save();
  
  // Send new verification code to user's email
  await this.notificationService.sendVerificationEmail(user.email, verificationCode);
  logger.info(`New verification code sent to: ${user.email}`);
  
  return { 
    success: true,
    message: "Verification code resent. Please check your email."
  };
}

/**
 * Verify email with 4-digit code
 */

async verifyEmailWithCode(email, code) {
  try {
    logger.info(`Verifying code for email: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      logger.error(`User not found: ${email}`);
      const error = new NotFoundError('User not found');
      error.canResend = false; // Can't resend to a non-existent user
      throw error;
    }
    
    // Check if already verified
    if (user.status === 'active' && user.verification && user.verification.verified) {
      logger.info(`User already verified: ${email}`);
      return {
        success: true,
        message: 'Email already verified',
        isVerified: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    }
    
    logger.info(`User verification data: ${JSON.stringify(user.verification)}`);
    
    if (!user.verification || !user.verification.code) {
      logger.error(`No verification code found for user: ${email}`);
      const error = new UnauthorizedError('No verification code found for this user');
      error.canResend = true; // Suggest resending since there's no code
      error.code = 'NO_VERIFICATION_CODE';
      throw error;
    }
    
    // Hash the provided code for comparison
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
    
    // Check if code matches
    if (hashedCode !== user.verification.code) {
      logger.error(`Invalid verification code for user: ${email}`);
      
      // Track verification attempts if not already tracking
      if (!user.verification.attempts) {
        user.verification.attempts = 1;
      } else {
        user.verification.attempts += 1;
      }
      await user.save();
      
      const error = new UnauthorizedError('Invalid verification code');
      error.code = 'INVALID_CODE';
      error.remainingAttempts = 3 - (user.verification.attempts || 0);
      
      // After multiple failed attempts, suggest resending
      if (user.verification.attempts >= 3) {
        error.canResend = true;
        error.message = 'Too many failed attempts. Please request a new code.';
      } else {
        error.canResend = false;
      }
      
      throw error;
    }
    
    // Check if code has expired
    if (user.verification.expires && new Date() > user.verification.expires) {
      logger.error(`Expired verification code for user: ${email}`);
      const error = new UnauthorizedError('Verification code has expired');
      error.code = 'VERIFICATION_EXPIRED';
      error.canResend = true; // Definitely suggest resending for expired codes
      throw error;
    }
    
    // Update user status
    user.verification.verified = true;
    user.status = 'active';
    user.verification.attempts = 0; // Reset attempts counter
    
    await user.save();
    logger.info(`User verified successfully: ${email}`);

    // Get organization details including uniqueId
    try {
      const organization = await Organization.findById(user.organization);

      if (organization && !organization.uniqueId) {
        // Generate the uniqueId now that email is verified
        organization.uniqueId = await Organization.generateUniqueId(organization.name);
        await organization.save();
        logger.info(`Generated unique ID for organization: ${organization.uniqueId}`);
      }
      
      // Generate tokens for the now-verified user
      const tokens = await this.generateAuthTokens(user);
      
      return {
        success: true,
        message: 'Email verified successfully',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
        token_type: "Bearer",
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        organization: organization ? {
          id: organization._id,
          name: organization.name,
          uniqueId: organization.uniqueId
        } : null
      };
    } catch (orgError) {
      logger.error(`Error with organization processing: ${orgError.message}`);
      
      // Even if organization processing fails, we should still return tokens
      // since the user is verified successfully
      const tokens = await this.generateAuthTokens(user);
      
      return {
        success: true,
        message: 'Email verified, but organization processing failed',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
        token_type: "Bearer",
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    }
  } catch (error) {
    logger.error(`Email verification failed: ${error.message}`);
    
    // Enhance the error with resend info if not already set
    if (error.code === 'VERIFICATION_EXPIRED' && error.canResend === undefined) {
      error.canResend = true;
    }
    
    throw error;
  }
}
// async verifyEmailWithCode(email, code) {
//   try {
//     logger.info(`Verifying code for email: ${email}`);
//     const user = await User.findOne({ email });
    
//     if (!user) {
//       logger.error(`User not found: ${email}`);
//       throw new NotFoundError('User not found');
//     }
    
//     logger.info(`User verification data: ${JSON.stringify(user.verification)}`);
    
//     if (!user.verification || !user.verification.code) {
//       logger.error(`No verification code found for user: ${email}`);
//       throw new UnauthorizedError('No verification code found for this user');
//     }
    
//     // Hash the provided code for comparison
//     const hashedCode = crypto
//       .createHash('sha256')
//       .update(code)
//       .digest('hex');
    
//     // Check if code matches and hasn't expired
//     if (hashedCode !== user.verification.code) {
//       logger.error(`Invalid verification code for user: ${email}`);
//       throw new UnauthorizedError('Invalid verification code');
//     }
    
//     if (user.verification.expires && new Date() > user.verification.expires) {
//       logger.error(`Expired verification code for user: ${email}`);
//       throw new UnauthorizedError('Verification code has expired');
//     }
    
//     // Update user status
//     user.verification.verified = true;
//     user.status = 'active';
    
//     await user.save();
//     logger.info(`User verified successfully: ${email}`);


//     // Get organization details including uniqueId
//     const organization = await Organization.findById(user.organization);

//     if (!organization.uniqueId) {
//       // Generate the uniqueId now that email is verified
//       organization.uniqueId = await Organization.generateUniqueId(organization.name);
//       await organization.save();
//       logger.info(`Generated unique ID for organization: ${organization.uniqueId}`);
//     }
    
//     // Generate tokens for the now-verified user
//     const tokens = await this.generateAuthTokens(user);
    
//     return {
//       success: true,
//       message: 'Email verified successfully',
//       access_token: tokens.accessToken,
//       refresh_token: tokens.refreshToken,
//       expires_in: this.getExpirationSeconds(config.jwt.expiresIn),
//       token_type: "Bearer",
//       user: {
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         role: user.role
//       },
//       organization: {
//         id: organization._id,
//         name: organization.name,
//         uniqueId: organization.uniqueId
//       }
//     };
//   } catch (error) {
//     logger.error(`Email verification failed: ${error.message}`);
//     throw error;
//   }
// }






}

module.exports = AuthService;