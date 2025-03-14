const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/auth.controller');
const { validate, sanitizeRequest } = require('../../middleware/validation.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');

const authController = new AuthController();



// Apply sanitization to all routes
router.use(sanitizeRequest);





router.post('/register', validate.registration, asyncHandler(authController.register.bind(authController)));
router.post('/login', authController.login.bind(authController));
router.post('/forgot-password', validate.forgotPassword, asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password', validate.passwordReset, asyncHandler(authController.resetPassword.bind(authController)));
router.post('/refresh-token', asyncHandler(authController.refreshToken.bind(authController)));
router.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));



router.get('/verify-email/:token',
  asyncHandler(authController.verifyEmail.bind(authController))
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification code
 * @access  Public
 */
router.post('/resend-verification',
  validate.resendVerification,
  asyncHandler(authController.resendVerification.bind(authController))
);

// Fix the duplicate route - you have two '/verify-2fa' routes
router.post('/enable-2fa',
  authenticate,
  asyncHandler(authController.enable2FA.bind(authController))
);

router.post('/verify-2fa-setup',
  authenticate,
  asyncHandler(authController.verify2FASetup.bind(authController))
);

router.post('/verify-2fa',
  authenticate,
  asyncHandler(authController.verify2FA.bind(authController))
);

router.post('/disable-2fa',
  authenticate,
  validate.disable2FA,
  asyncHandler(authController.disable2FA.bind(authController))
);





router.post('/verify-email-code', 
  validate.verifyEmailCode,
  asyncHandler(authController.verifyEmailWithCode.bind(authController))
);
module.exports = router;