const AuthService = require('../services/auth.service');

const { validateRegistration } = require('../utils/validation');

const logger = require('../utils/logger');

class AuthController {
  constructor() {
    this.authService = new AuthService();
    logger.info('AuthController constructed, authService:', !!this.authService);
  
  }

  /**
   * Register a new organization admin
   */

  async register(req, res, next) {
    try {
      const { organization: orgData, admin: adminData, plan: planData } = req.body;
  
      // Call service to register organization
      const result = await this.authService.registerOrganization(
        orgData,
        adminData,
        planData
      );
  
      // Log success and return response
      logger.info(`Organization registration initiated for: ${adminData.email}`);
      res.status(201).json({
        status: "success",
        message: "Registration initiated. Please verify your email with the code sent.",
        data: {
          organization: result.organization.name,
          email: adminData.email
        }
      });
    } catch (error) {
      // Log error and pass to error middleware
      logger.error(`Registration failed: ${error.message}`);
      next(error);
    }
  }


  


  /**
   * Login user
   */



  // src/controllers/auth.controller.js
async login(req, res, next) {
  try {
    logger.info('Login called, req.body.email: ' + req.body.email); // String concat
    logger.info('Login called, this:', this);
    logger.info('Login called, this.authService: ' + !!this.authService);
    const { email, password } = req.body;
    logger.info('Login called, extracted email: ' + email);
    const result = await this.authService.login(email, password);
    logger.info('Login result:', result);
    logger.info('User logged in successfully: ' + email);
    res.json(result);
  } catch (error) {
    logger.error('Login failed: ' + error.message);
    next(error);

  }
}

  /**
   * Verify 2FA token
   */


  /**
   * Request password reset
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      await this.authService.requestPasswordReset(email);
      logger.info(`Password reset requested for: ${email}`);
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      logger.error(`Password reset request failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await this.authService.resetPassword(token, newPassword);
      logger.info('Password reset successful');
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      logger.error(`Password reset failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req, res, next) {
    try {
      const { userId } = req.user;

      const { refreshToken } = req.body;
      await this.authService.logout(userId, refreshToken || null);
      
      logger.info('User logged out: ' + userId);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error(`Logout failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      // Look for refresh token in multiple possible locations
      const refreshToken = req.body.refresh_token || // From your OpenAPI spec
                            req.body.refreshToken ||  // Current implementation
                            req.headers['x-refresh-token'];
      
      // Add validation to prevent the substring error
      if (!refreshToken) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_REQUEST",
          message: "Refresh token is required"
        });
      }
      
      logger.info(`Refreshing with token: ${refreshToken.substring(0, 10)}...`);
      const result = await this.authService.refreshToken(refreshToken);
      logger.info('Token refreshed successfully');
      res.json(result);
    } catch (error) {
      logger.error(`Token refresh failed: ${error.message}`);
      next(error);
    }
  }

  /**
 * Enable 2FA
 */
async enable2FA(req, res, next) {
  try {
    const { userId } = req.user;
    const result = await this.authService.enable2FA(userId);
    logger.info(`2FA setup initiated for user: ${userId}`);
    res.json({
      status: "success",
      data: {
        secret: result.secret,
        qrCode: result.qrCode
      }
    });
  } catch (error) {
    logger.error(`2FA setup failed: ${error.message}`);
    next(error);
  }
}

/**
 * Verify and activate 2FA setup
 */
async verify2FASetup(req, res, next) {
  try {
    const { userId } = req.user;
    const { code } = req.body;
    
    const result = await this.authService.verify2FASetup(userId, code);
    logger.info(`2FA setup verified and enabled for user: ${userId}`);
    res.json({
      status: "success",
      message: "Two-factor authentication enabled successfully"
    });
  } catch (error) {
    logger.error(`2FA verification failed: ${error.message}`);
    next(error);
  }
}

/**
 * Disable 2FA
 */
async disable2FA(req, res, next) {
  try {
    const { userId } = req.user;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Password is required to disable 2FA"
      });
    }
    
    await this.authService.disable2FA(userId, password);
    logger.info(`2FA disabled for user: ${userId}`);
    res.json({
      status: "success",
      message: "Two-factor authentication disabled successfully"
    });
  } catch (error) {
    logger.error(`Disable 2FA failed: ${error.message}`);
    next(error);
  }
}

/**
 * Verify 2FA during login
 */
async verify2FA(req, res, next) {
  try {
    const { userId } = req.user;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Verification code is required"
      });
    }
    
    // Collect request information for login tracking
    const requestInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    const result = await this.authService.verify2FA(userId, code, requestInfo);
    logger.info(`2FA verification successful for user: ${userId}`);
    res.json(result);
  } catch (error) {
    logger.error(`2FA verification failed: ${error.message}`);
    next(error);
  }
}
/**
 * Verify user's email address
 */
async verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    
    await this.authService.verifyEmail(token);
    logger.info('Email verification successful');
    res.json({
      status: "success",
      message: "Email verified successfully"
    });
  } catch (error) {
    logger.error(`Email verification failed: ${error.message}`);
    next(error);
  }
}



/**
 * Resend verification email
 */
async resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Email is required"
      });
    }
    
    const result = await this.authService.resendVerification(email);
    logger.info(`Verification code resent to: ${email}`);
    res.json(result);
  } catch (error) {
    logger.error(`Resend verification failed: ${error.message}`);
    next(error);
  }
}
/**
 * Verify email with code
 */
async verifyEmailWithCode(req, res, next) {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        status: "error",
        code: "INVALID_REQUEST",
        message: "Email and verification code are required"
      });
    }
    
    const result = await this.authService.verifyEmailWithCode(email, code);
    logger.info(`Email verification successful for: ${email}`);
    res.json(result);
  } catch (error) {
    logger.error(`Email verification failed: ${error.message}`);
    next(error);
  }
}



}






module.exports = AuthController;

