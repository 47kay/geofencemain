const SubscriptionService = require('../services/subscription.service');
const { validateSubscription } = require('../utils/validation');
const logger = require('../utils/logger');

class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Create new subscription
   */
  async createSubscription(req, res, next) {
    try {
      const validationResult = validateSubscription(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.errors });
      }

      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const subscription = await this.subscriptionService.createSubscription({
        ...req.body,
        organizationId
      });

      logger.info(`Created subscription for organization: ${organizationId}`);
      res.status(201).json(subscription);
    } catch (error) {
      logger.error(`Failed to create subscription: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId;

      if (requestedOrgId) {
        // If not a platform admin and trying to access another organization
        if (requestedOrgId !== organizationId &&
            !['platform_admin', 'platform_superadmin'].includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Cannot access subscriptions from other organizations'
          });
        }

        // For platform admins or self access
        const subscription = await this.subscriptionService.getSubscription(requestedOrgId);
        logger.info(`Retrieved subscription for organization: ${requestedOrgId}`);
        return res.json(subscription);
      }

      // No specific org requested, use context
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context is required'
        });
      }

      const subscription = await this.subscriptionService.getSubscription(organizationId);

      logger.info(`Retrieved subscription for organization: ${organizationId}`);
      res.json(subscription);
    } catch (error) {
      logger.error(`Failed to get subscription: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId || organizationId;

      if (!organizationId || (requestedOrgId !== organizationId &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update subscriptions from other organizations'
        });
      }

      const { planId, paymentMethod } = req.body;

      const updatedSubscription = await this.subscriptionService.updateSubscription(
          requestedOrgId,
          { planId, paymentMethod }
      );

      logger.info(`Updated subscription for organization: ${requestedOrgId}`);
      res.json(updatedSubscription);
    } catch (error) {
      logger.error(`Failed to update subscription: ${error.message}`);
      next(error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId || organizationId;

      if (!organizationId || (requestedOrgId !== organizationId &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Cannot cancel subscriptions from other organizations'
        });
      }

      const { reason } = req.body;

      await this.subscriptionService.cancelSubscription(requestedOrgId, reason);

      logger.info(`Cancelled subscription for organization: ${requestedOrgId}`);
      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      logger.error(`Failed to cancel subscription: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId || organizationId;

      if (!organizationId || (requestedOrgId !== organizationId &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Cannot access billing history from other organizations'
        });
      }

      const { page = 1, limit = 10 } = req.query;

      const history = await this.subscriptionService.getBillingHistory(
          requestedOrgId,
          { page, limit }
      );

      logger.info(`Retrieved billing history for organization: ${requestedOrgId}`);
      res.json(history);
    } catch (error) {
      logger.error(`Failed to get billing history: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId || organizationId;

      if (!organizationId || (requestedOrgId !== organizationId &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update payment methods for other organizations'
        });
      }

      const { paymentMethodId } = req.body;

      const result = await this.subscriptionService.updatePaymentMethod(
          requestedOrgId,
          paymentMethodId
      );

      logger.info(`Updated payment method for organization: ${requestedOrgId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to update payment method: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get available plans
   * This is a public endpoint that doesn't need tenant isolation
   */
  async getPlans(req, res, next) {
    try {
      const plans = await this.subscriptionService.getAvailablePlans();

      logger.info('Retrieved available subscription plans');
      res.json(plans);
    } catch (error) {
      logger.error(`Failed to get plans: ${error.message}`);
      next(error);
    }
  }

  /**
   * Generate invoice
   */
  async generateInvoice(req, res, next) {
    try {
      // Use organization context from tenant middleware
      const organizationId = req.organizationContext;

      // If organization ID is provided in the params, check access permission
      const requestedOrgId = req.params.organizationId || organizationId;

      if (!organizationId || (requestedOrgId !== organizationId &&
          !['platform_admin', 'platform_superadmin'].includes(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Cannot generate invoices for other organizations'
        });
      }

      const { invoiceId } = req.params;

      const invoice = await this.subscriptionService.generateInvoice(
          requestedOrgId,
          invoiceId
      );

      logger.info(`Generated invoice for organization: ${requestedOrgId}`);
      res.json(invoice);
    } catch (error) {
      logger.error(`Failed to generate invoice: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new SubscriptionController();