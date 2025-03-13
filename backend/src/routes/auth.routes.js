const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { validate, sanitizeRequest } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const authController = new AuthController();



// Apply sanitization to all routes
router.use(sanitizeRequest);





router.post('/register', validate.registration, asyncHandler(authController.register.bind(authController)));
router.post('/login', authController.login.bind(authController));
router.post('/forgot-password', validate.forgotPassword, asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password', validate.passwordReset, asyncHandler(authController.resetPassword.bind(authController)));
router.post('/refresh-token', asyncHandler(authController.refreshToken.bind(authController)));
router.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));



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