const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Organization = require('../models/organization.model');
const Subscription = require('../models/subscription.model');
const NotificationService = require('./notification.service');
const { PaymentError } = require('../utils/errors');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Create customer
   */
  async createCustomer(organizationId, paymentMethod) {
    const organization = await Organization.findById(organizationId);
    
    try {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: organization.contact.email,
        name: organization.name,
        payment_method: paymentMethod.id,
        invoice_settings: {
          default_payment_method: paymentMethod.id
        },
        metadata: {
          organizationId: organization._id.toString()
        }
      });

      // Update organization with customer ID
      organization.billing = organization.billing || {};
      organization.billing.stripeCustomerId = customer.id;
      await organization.save();

      return customer;
    } catch (error) {
      logger.error('Failed to create customer', { error, organizationId });
      throw new PaymentError('Failed to create customer');
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(organizationId, planId, paymentMethod) {
    const organization = await Organization.findById(organizationId);
    
    try {
      let customer;
      
      // Get or create customer
      if (!organization.billing?.stripeCustomerId) {
        customer = await this.createCustomer(organizationId, paymentMethod);
      } else {
        customer = await stripe.customers.retrieve(organization.billing.stripeCustomerId);
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId: organization._id.toString()
        }
      });

      // Create local subscription record
      const localSubscription = new Subscription({
        organization: organizationId,
        stripeSubscriptionId: subscription.id,
        plan: this.getPlanFromStripePrice(planId),
        status: 'pending',
        billing: {
          amount: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency,
          interval: subscription.items.data[0].price.recurring.interval,
          nextBillingDate: new Date(subscription.current_period_end * 1000)
        }
      });

      await localSubscription.save();

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      logger.error('Failed to create subscription', { error, organizationId });
      throw new PaymentError('Failed to create subscription');
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(organizationId, newPlanId) {
    const subscription = await Subscription.findOne({ organization: organizationId });
    
    try {
      // Update Stripe subscription
      const updatedSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: updatedSubscription.items.data[0].id,
          price: newPlanId
        }],
        proration_behavior: 'create_prorations'
      });

      // Update local subscription
      subscription.plan = this.getPlanFromStripePrice(newPlanId);
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription', { error, organizationId });
      throw new PaymentError('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId) {
    const subscription = await Subscription.findOne({ organization: organizationId });
    
    try {
      // Cancel Stripe subscription
      await stripe.subscriptions.del(subscription.stripeSubscriptionId);

      // Update local subscription
      subscription.status = 'cancelled';
      subscription.cancellationDate = new Date();
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, organizationId });
      throw new PaymentError('Failed to cancel subscription');
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(organizationId, paymentMethodId) {
    const organization = await Organization.findById(organizationId);
    
    try {
      await stripe.customers.update(organization.billing.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to update payment method', { error, organizationId });
      throw new PaymentError('Failed to update payment method');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    const { type, data } = event;

    switch (type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(data.object);
        break;

      default:
        logger.info(`Unhandled webhook event: ${type}`);
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });

    if (!subscription) {
      logger.error('Subscription not found for invoice', { invoiceId: invoice.id });
      return;
    }

    // Update subscription status and billing info
    subscription.status = 'active';
    subscription.billing.lastPaymentDate = new Date();
    subscription.billing.nextBillingDate = new Date(invoice.next_payment_attempt * 1000);
    await subscription.save();

    // Create invoice record
    await this.createInvoiceRecord(subscription.organization, invoice);

    // Notify organization admins
    await this.notificationService.sendPaymentSuccessNotification(
      subscription.organization,
      {
        amount: invoice.total / 100,
        currency: invoice.currency,
        invoiceNumber: invoice.number
      }
    );
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });

    if (!subscription) {
      logger.error('Subscription not found for invoice', { invoiceId: invoice.id });
      return;
    }

    // Update subscription status
    subscription.status = 'past_due';
    await subscription.save();

    // Notify organization admins
    await this.notificationService.sendPaymentFailedNotification(
      subscription.organization,
      {
        amount: invoice.total / 100,
        currency: invoice.currency,
        reason: invoice.last_payment_error?.message
      }
    );
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCancelled(subscription) {
    const localSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    if (!localSubscription) {
      logger.error('Local subscription not found', { subscriptionId: subscription.id });
      return;
    }

    localSubscription.status = 'cancelled';
    localSubscription.cancellationDate = new Date();
    await localSubscription.save();

    // Notify organization admins
    await this.notificationService.sendSubscriptionCancelledNotification(
      localSubscription.organization
    );
  }

  /**
   * Handle subscription update
   */
  async handleSubscriptionUpdated(subscription) {
    const localSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    if (!localSubscription) {
      logger.error('Local subscription not found', { subscriptionId: subscription.id });
      return;
    }

    // Update local subscription details
    localSubscription.plan = this.getPlanFromStripePrice(subscription.items.data[0].price.id);
    localSubscription.billing.amount = subscription.items.data[0].price.unit_amount / 100;
    localSubscription.billing.interval = subscription.items.data[0].price.recurring.interval;
    localSubscription.billing.nextBillingDate = new Date(subscription.current_period_end * 1000);
    await localSubscription.save();
  }

  /**
   * Create invoice record
   */
  async createInvoiceRecord(organizationId, stripeInvoice) {
    const invoice = new Invoice({
      organization: organizationId,
      stripeInvoiceId: stripeInvoice.id,
      amount: stripeInvoice.total / 100,
      currency: stripeInvoice.currency,
      status: stripeInvoice.status,
      invoiceNumber: stripeInvoice.number,
      invoiceDate: new Date(stripeInvoice.created * 1000),
      paidAt: stripeInvoice.status === 'paid' ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
      items: stripeInvoice.lines.data.map(item => ({
        description: item.description,
        amount: item.amount / 100,
        period: {
          start: new Date(item.period.start * 1000),
          end: new Date(item.period.end * 1000)
        }
      }))
    });

    await invoice.save();
    return invoice;
  }

  /**
   * Get plan type from Stripe price ID
   */
  getPlanFromStripePrice(priceId) {
    const priceToPlan = {
      [process.env.STRIPE_BASIC_PLAN_ID]: 'basic',
      [process.env.STRIPE_PROFESSIONAL_PLAN_ID]: 'professional',
      [process.env.STRIPE_ENTERPRISE_PLAN_ID]: 'enterprise'
    };

    return priceToPlan[priceId] || 'basic';
  }
}

module.exports = PaymentService;