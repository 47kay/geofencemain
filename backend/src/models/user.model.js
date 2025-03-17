const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'user'],
    default: 'user'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  invitationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  invitationToken: String,
  invitationExpires: Date,
  profile: {
    phone: {
      type: String,
      trim: true
    },
    avatar: {
      type: String
    },
    jobTitle: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    }
  },
  verification: {
    code: String,
    token: String,
    expires: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  lastLogin: {
    timestamp: Date,
    ip: String,
    userAgent: String
  },
  security: {
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: String,
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  tokens: [{
    token: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['refresh', 'access']
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(_, ret) {
      delete ret.password;
      delete ret.tokens;
      delete ret.security;
      return ret;
    }
  }
});




// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ organization: 1 });
userSchema.index({ status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.security.passwordChangedAt = Date.now();
  }
  next();
});

// Methods
userSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generatePasswordResetToken = function() {
  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.security.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.security.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return resetToken;
  } catch (error) {
    console.error('Error in generatePasswordResetToken:', error);
    throw error; // Bubble up for better debugging
  }
};

userSchema.methods.recordLogin = function(ip, userAgent) {
  this.lastLogin = {
    timestamp: Date.now(),
    ip,
    userAgent
  };
  this.security.loginAttempts = 0;
  this.security.lockUntil = undefined;
  return this.save();
};

userSchema.methods.incrementLoginAttempts = async function() {
  // Lock account if too many attempts
  if (this.security.lockUntil && this.security.lockUntil > Date.now()) {
    throw new Error('Account is locked. Try again later.');
  }
  
  this.security.loginAttempts += 1;
  if (this.security.loginAttempts >= 5) {
    this.security.lockUntil = Date.now() + 3600000; // 1 hour lock
  }
  return this.save();
};

// Statics
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId });
};

const User = mongoose.model('User', userSchema);



module.exports = User;