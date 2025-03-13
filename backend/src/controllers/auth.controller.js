const AuthService = require('../services/auth.service');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    this.authService = new AuthService();
    // this.register = this.register.bind(this);
  }

  /**
   * Register a new organization admin
   */


  async register(req, res, next) {
    try {

      // Validate request body
      const validationResult = validateRegistration(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      // Extract data from request body


      // Log success and return response
      logger.info(`Organization registered successfully: ${organization.name}`);
      res.status(201).json(result);
    } catch (error) {
      // Log error and pass to error middleware
      logger.error(`Registration failed: ${error.message}`);
      next(error);
    }
  }
  
  // async register(req, res, next) {
  //   try {
  //     const validationResult = validateRegistration(req.body);
  //     if (!validationResult.success) {
  //       return res.status(400).json({ error: validationResult.errors });
  //     }

  //     const { organization, admin, plan } = req.body;
  //     const result = await this.authService.registerOrganization(organization, admin, plan);
      
  //     logger.info(`Organization registered successfully: ${organization.name}`);
  //     res.status(201).json(result);
  //   } catch (error) {
  //     logger.error(`Registration failed: ${error.message}`);
  //     next(error);
  //   }
  // }

  // register = async (req, res, next) => {
  //   try {
  //     const validationResult = validateRegistration(req.body);
  //     if (!validationResult.success) {
  //       return res.status(400).json({ error: validationResult.errors });
  //     }

  //     const { organization, admin, plan } = req.body;
  //     const result = await this.authService.registerOrganization(organization, admin, plan);
      
  //     logger.info(`Organization registered successfully: ${organization.name}`);
  //     res.status(201).json(result);
  //   } catch (error) {
  //     logger.error(`Registration failed: ${error.message}`);
  //     next(error);
  //   }
  // };

  /**
   * Login user
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Collect request information for login tracking
      const requestInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      
      const result = await this.authService.login(email, password, requestInfo);
      logger.info(`User logged in successfully: ${email}`);
      res.json(result);
    } catch (error) {
      logger.error(`Login failed: ${error.message}`);
      next(error);
    }
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(req, res, next) {
    try {
      const { userId, token } = req.body;
      
      // Collect request information for login tracking
      const requestInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      
      const result = await this.authService.verify2FA(userId, token, requestInfo);
      logger.info(`2FA verification successful for user: ${userId}`);
      res.json(result);
    } catch (error) {
      logger.error(`2FA verification failed: ${error.message}`);
      next(error);
    }
  }

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
      const refreshToken = req.body.refreshToken || 
                          req.headers['x-refresh-token'];
                          
      await this.authService.logout(userId, refreshToken);
      logger.info(`User logged out: ${userId}`);
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
      const refreshToken = req.body.refreshToken || 
                          req.headers['x-refresh-token'];
                          
      const result = await this.authService.refreshToken(refreshToken);
      logger.info('Token refreshed successfully');
      res.json(result);
    } catch (error) {
      logger.error(`Token refresh failed: ${error.message}`);
      next(error);
    }
  }
}


module.exports = AuthController;

