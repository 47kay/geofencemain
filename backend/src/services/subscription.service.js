// src/services/subscription.service.js
const Organization = require('../models/organization.model');
const Subscription = require('../models/subscription.model');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  /**
   * Create new subscription
   */
  async createSubscription(data) {
    try {
      const { organizationId, plan, billing } = data;
      
      // Check if organization already has a subscription
      const existingSubscription = await Subscription.findOne({ organizationId });
      if (existingSubscription) {
        throw new ConflictError('Organization already has an active subscription');
      }

      // Create Stripe customer and subscription
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new NotFoundError('Organization not found');
      }

      const customer = await stripe.customers.create({
        email: organization.contact.email,
        metadata: {
          organizationId: organizationId
        }
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      });

      // Create subscription record in database
      const newSubscription = await Subscription.create({
        organizationId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        plan,
        status: 'active',
        billing,
        startDate: new Date(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });

      return newSubscription;
    } catch (error) {
      logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(organizationId) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Get latest subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Update local subscription status if needed
      if (subscription.status !== stripeSubscription.status) {
        subscription.status = stripeSubscription.status;
        await subscription.save();
      }

      return subscription;
    } catch (error) {
      logger.error(`Failed to get subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(organizationId, { planId, paymentMethod }) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Update Stripe subscription
      const updatedStripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: [{ price: planId }],
          default_payment_method: paymentMethod
        }
      );

      // Update local subscription record
      subscription.plan = planId;
      subscription.currentPeriodEnd = new Date(updatedStripeSubscription.current_period_end * 1000);
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId, reason) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Cancel Stripe subscription
      await stripe.subscriptions.del(subscription.stripeSubscriptionId);

      // Update local subscription record
      subscription.status = 'cancelled';
      subscription.cancellationReason = reason;
      subscription.cancelledAt = new Date();
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error(`Failed to cancel subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(organizationId, { page = 1, limit = 10 }) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: limit,
        starting_after: (page - 1) * limit > 0 ? ((page - 1) * limit).toString() : undefined
      });

      return {
        invoices: invoices.data,
        hasMore: invoices.has_more,
        total: invoices.total_count
      };
    } catch (error) {
      logger.error(`Failed to get billing history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(organizationId, paymentMethodId) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Update customer's default payment method in Stripe
      await stripe.customers.update(subscription.stripeCustomerId, {
        default_source: paymentMethodId
      });

      // Update subscription's default payment method
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId
      });

      return { success: true, message: 'Payment method updated successfully' };
    } catch (error) {
      logger.error(`Failed to update payment method: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available plans
   */
  async getAvailablePlans() {
    try {
      // Get prices from Stripe
      const prices = await stripe.prices.list({
        active: true,
        type: 'recurring',
        expand: ['data.product']
      });

      // Format plans with features and limits
      const plans = prices.data.map(price => ({
        id: price.id,
        name: price.product.name,
        description: price.product.description,
        features: price.product.metadata.features ? 
          JSON.parse(price.product.metadata.features) : [],
        limits: price.product.metadata.limits ?
          JSON.parse(price.product.metadata.limits) : {},
        price: price.unit_amount / 100,
        currency: price.currency,
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count
      }));

      return plans;
    } catch (error) {
      logger.error(`Failed to get available plans: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate invoice
   */
  async generateInvoice(organizationId, invoiceId) {
    try {
      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      // Get invoice from Stripe
      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ['customer', 'subscription']
      });

      // Check if invoice belongs to organization
      if (invoice.customer.id !== subscription.stripeCustomerId) {
        throw new Error('Invoice does not belong to this organization');
      }

      // Generate PDF invoice
      const pdf = await stripe.invoices.retrievePdf(invoiceId);

      return {
        invoice,
        pdf
      };
    } catch (error) {
      logger.error(`Failed to generate invoice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: event.data.object.id
          });
          if (subscription) {
            subscription.status = event.data.object.status;
            await subscription.save();
          }
          break;

        case 'invoice.payment_succeeded':
          // Handle successful payment
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          break;

        default:
          logger.info(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error(`Failed to handle webhook event: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SubscriptionService;