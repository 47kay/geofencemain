const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateSchema, subscriptionSchema } = require('../utils/validation');
const { asyncHandler } = require('../middleware/error.middleware');

// Add some debug logs to verify our imports
console.log('Subscription Route Dependencies:', {
    validateSchema: typeof validateSchema,
    subscriptionSchema: typeof subscriptionSchema,
    asyncHandler: typeof asyncHandler
});

// Auth middleware for all subscription routes
router.use(authMiddleware.authenticate);

/**
 * @route   POST /api/subscriptions
 * @desc    Create new subscription
 * @access  Private - Admin only
 */
router.post('/',
    authMiddleware.authorize(['admin']),
    validateSchema(subscriptionSchema),
    asyncHandler(subscriptionController.createSubscription)
);

/**
 * @route   GET /api/subscriptions
 * @desc    Get subscription details
 * @access  Private - Admin only
 */
router.get('/',
    authMiddleware.authorize(['admin']),
    asyncHandler(subscriptionController.getSubscription)
);

/**
 * @route   PUT /api/subscriptions
 * @desc    Update subscription
 * @access  Private - Admin only
 */
router.put('/',
    authMiddleware.authorize(['admin']),
    validateSchema(subscriptionSchema),
    asyncHandler(subscriptionController.updateSubscription)
);

/**
 * @route   DELETE /api/subscriptions
 * @desc    Cancel subscription
 * @access  Private - Admin only
 */
router.delete('/',
    authMiddleware.authorize(['admin']),
    asyncHandler(subscriptionController.cancelSubscription)
);

/**
 * @route   GET /api/subscriptions/billing
 * @desc    Get billing history
 * @access  Private - Admin only
 */
router.get('/billing',
    authMiddleware.authorize(['admin']),
    asyncHandler(subscriptionController.getBillingHistory)
);

/**
 * @route   PUT /api/subscriptions/payment
 * @desc    Update payment method
 * @access  Private - Admin only
 */
router.put('/payment',
    authMiddleware.authorize(['admin']),
    asyncHandler(subscriptionController.updatePaymentMethod)
);

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get available plans
 * @access  Public
 */
router.get('/plans',
    asyncHandler(subscriptionController.getPlans)
);

/**
 * @route   GET /api/subscriptions/invoice/:invoiceId
 * @desc    Generate invoice
 * @access  Private - Admin only
 */
router.get('/invoice/:invoiceId',
    authMiddleware.authorize(['admin']),
    asyncHandler(subscriptionController.generateInvoice)
);

module.exports = router;