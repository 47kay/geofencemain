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

      const { organizationId } = req.user;
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
      const { organizationId } = req.user;
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
      const { organizationId } = req.user;
      const { planId, paymentMethod } = req.body;
      
      const updatedSubscription = await this.subscriptionService.updateSubscription(
        organizationId,
        { planId, paymentMethod }
      );
      
      logger.info(`Updated subscription for organization: ${organizationId}`);
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
      const { organizationId } = req.user;
      const { reason } = req.body;
      
      await this.subscriptionService.cancelSubscription(organizationId, reason);
      
      logger.info(`Cancelled subscription for organization: ${organizationId}`);
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
      const { organizationId } = req.user;
      const { page = 1, limit = 10 } = req.query;
      
      const history = await this.subscriptionService.getBillingHistory(
        organizationId,
        { page, limit }
      );
      
      logger.info(`Retrieved billing history for organization: ${organizationId}`);
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
      const { organizationId } = req.user;
      const { paymentMethodId } = req.body;
      
      const result = await this.subscriptionService.updatePaymentMethod(
        organizationId,
        paymentMethodId
      );
      
      logger.info(`Updated payment method for organization: ${organizationId}`);
      res.json(result);
    } catch (error) {
      logger.error(`Failed to update payment method: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get available plans
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
      const { organizationId } = req.user;
      const { invoiceId } = req.params;
      
      const invoice = await this.subscriptionService.generateInvoice(
        organizationId,
        invoiceId
      );
      
      logger.info(`Generated invoice for organization: ${organizationId}`);
      res.json(invoice);
    } catch (error) {
      logger.error(`Failed to generate invoice: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new SubscriptionController();