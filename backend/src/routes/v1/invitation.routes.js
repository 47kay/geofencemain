const express = require('express');
const router = express.Router();
const InvitationController = require('../../controllers/invitation.controller');
const { validate, sanitizeRequest } = require('../../middleware/validation.middleware');
const { authenticate, isAdmin, hasPermission } = require('../../middleware/auth.middleware');
const { asyncHandler } = require('../../middleware/error.middleware');



// Add this at the top of your router definitions in invitation.routes.js
router.get('/test', (req, res) => {
  res.json({ message: 'Invitation routes are working' });
});
// Create controller instance
const invitationController = new InvitationController();

// Apply sanitization to all routes
router.use(sanitizeRequest);

// Define validation schema for invitation (if not already in validation.middleware.js)
const inviteUserSchema = {
  email: { 
    isEmail: true, 
    errorMessage: 'Valid email is required' 
  },
  role: { 
    isIn: { 
      options: [['admin', 'manager', 'user']], 
      errorMessage: 'Role must be admin, manager, or user'
    }
  }
};

// Invite a user (admin, manager, or employee)
router.post('/invite',
  authenticate,
  validate.inviteUser, // Make sure this is defined in validation.middleware.js
  asyncHandler(invitationController.inviteUser.bind(invitationController))
);

// Complete registration from invitation (public route)
router.post('/complete-registration',
  validate.completeRegistration, // Make sure this is defined in validation.middleware.js
  asyncHandler(invitationController.completeRegistration.bind(invitationController))
);

// Resend invitation
router.post('/:invitationId/resend',
  authenticate,
  asyncHandler(invitationController.resendInvitation.bind(invitationController))
);

// Cancel invitation
router.delete('/:invitationId',
  authenticate,
  asyncHandler(invitationController.cancelInvitation.bind(invitationController))
);

// List pending invitations
router.get('/',
  authenticate,
  asyncHandler(invitationController.listInvitations.bind(invitationController))
);

module.exports = router;