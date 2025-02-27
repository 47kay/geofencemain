const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'cancelled'],
    default: 'pending'
  },
  billing: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    interval: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true
    },
    nextBillingDate: Date,
    paymentMethod: {
      type: {
        type: String,
        enum: ['credit_card', 'bank_transfer', 'paypal'],
        required: true
      },
      details: {
        lastFour: String,
        expiryDate: String,
        cardType: String,
        paymentToken: String,
        paymentProcessor: {
          type: String,
          enum: ['stripe', 'paypal', 'other']
        }
      }
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  features: {
    maxEmployees: {
      type: Number,
      required: true
    },
    maxGeofences: {
      type: Number,
      required: true
    },
    locationTracking: {
      enabled: {
        type: Boolean,
        default: true
      },
      interval: {
        type: Number,
        default: 300  // 5 minutes in seconds
      }
    },
    reporting: {
      enabled: {
        type: Boolean,
        default: true
      },
      retention: {
        type: Number,
        default: 90  // days
      },
      exportFormats: [{
        type: String,
        enum: ['pdf', 'csv', 'excel']
      }]
    },
    support: {
      type: String,
      enum: ['email', 'email_phone', 'dedicated'],
      required: true
    },
    apiAccess: {
      enabled: {
        type: Boolean,
        default: false
      },
      rateLimit: {
        type: Number,
        default: 1000  // requests per day
      }
    }
  },
  usage: {
    currentEmployeeCount: {
      type: Number,
      default: 0
    },
    currentGeofenceCount: {
      type: Number,
      default: 0
    },
    apiRequests: {
      count: {
        type: Number,
        default: 0
      },
      lastReset: Date
    },
    storageUsed: {
      type: Number,
      default: 0  // in bytes
    }
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'payment_failed']
    },
    date: {
      type: Date,
      default: Date.now
    },
    details: {
      fromPlan: String,
      toPlan: String,
      reason: String
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trialEnds: Date,
    cancelledAt: Date,
    cancellationReason: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionSchema.index({ organization: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'billing.nextBillingDate': 1 });

// Methods
subscriptionSchema.methods.isFeatureAvailable = function(featureName) {
  const planFeatures = {
    basic: ['locationTracking', 'reporting'],
    professional: ['locationTracking', 'reporting', 'apiAccess'],
    enterprise: ['locationTracking', 'reporting', 'apiAccess', 'dedicated_support']
  };
  return planFeatures[this.plan].includes(featureName);
};

subscriptionSchema.methods.updateUsage = async function() {
  const [employeeCount, geofenceCount] = await Promise.all([
    mongoose.model('Employee').countDocuments({ organization: this.organization, status: 'active' }),
    mongoose.model('Geofence').countDocuments({ organization: this.organization, status: 'active' })
  ]);

  this.usage.currentEmployeeCount = employeeCount;
  this.usage.currentGeofenceCount = geofenceCount;
  return this.save();
};

subscriptionSchema.methods.canAddEmployee = function() {
  return this.usage.currentEmployeeCount < this.features.maxEmployees;
};

subscriptionSchema.methods.canAddGeofence = function() {
  return this.usage.currentGeofenceCount < this.features.maxGeofences;
};

subscriptionSchema.methods.recordApiRequest = async function() {
  // Reset counter if it's a new day
  if (!this.usage.apiRequests.lastReset ||
      new Date().toDateString() !== this.usage.apiRequests.lastReset.toDateString()) {
    this.usage.apiRequests.count = 0;
    this.usage.apiRequests.lastReset = new Date();
  }

  this.usage.apiRequests.count += 1;
  return this.save();
};

subscriptionSchema.methods.changePlan = async function(newPlan, reason, userId) {
  const oldPlan = this.plan;
  this.plan = newPlan;
  
  this.history.push({
    action: newPlan > oldPlan ? 'upgraded' : 'downgraded',
    details: {
      fromPlan: oldPlan,
      toPlan: newPlan,
      reason
    },
    performedBy: userId
  });

  await this.updateFeatures(newPlan);
  return this.save();
};

// Statics
subscriptionSchema.statics.findExpiring = function(days = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    status: 'active',
    'billing.nextBillingDate': {
      $lte: expiryDate
    }
  });
};

// Pre-save hooks
subscriptionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Set trial end date for new subscriptions
    this.metadata.trialEnds = new Date();
    this.metadata.trialEnds.setDate(this.metadata.trialEnds.getDate() + 14); // 14-day trial
  }

  // Update next billing date if plan is active
  if (this.status === 'active' && !this.billing.nextBillingDate) {
    this.billing.nextBillingDate = new Date();
    this.billing.nextBillingDate.setMonth(
      this.billing.nextBillingDate.getMonth() + 
      (this.billing.interval === 'yearly' ? 12 : 1)
    );
  }

  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;