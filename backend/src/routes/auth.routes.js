const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate, sanitizeRequest } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Apply sanitization to all routes
router.use(sanitizeRequest);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new organization and admin user
 * @access  Public
 */
router.post('/register',
  validate.registration,
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login',
  validate.login,
  asyncHandler(authController.login)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password',
  validate.forgotPassword,
  asyncHandler(authController.forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password',
  validate.passwordReset,
  asyncHandler(authController.resetPassword)
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Get new access token using refresh token
 * @access  Public
 */
router.post('/refresh-token',
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
router.post('/logout',
  authenticate,
  asyncHandler(authController.logout)
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify user's email address
 * @access  Public
 */
router.get('/verify-email/:token',
  asyncHandler(authController.verifyEmail)
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private
 */
router.post('/resend-verification',
  authenticate,
  asyncHandler(authController.resendVerification)
);

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code
 * @access  Private
 */
router.post('/verify-2fa',
  authenticate,
  asyncHandler(authController.verify2FA)
);

/**
 * @route   POST /api/auth/enable-2fa
 * @desc    Enable 2FA for user
 * @access  Private
 */
router.post('/verify-2fa',
  asyncHandler(authController.verify2FA)
);

/**
 * @route   POST /api/auth/disable-2fa
 * @desc    Disable 2FA for user
 * @access  Private
 */
router.post('/disable-2fa',
  authenticate,
  asyncHandler(authController.disable2FA)
);

module.exports = router;