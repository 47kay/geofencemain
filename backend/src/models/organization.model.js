const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const organizationSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  industry: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  contact: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  uniqueId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      }
    },
    workDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  metadata: {
    employeeCount: {
      type: Number,
      default: 0
    },
    geofenceCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting all employees
organizationSchema.virtual('employees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'organization'
});

// Virtual for getting all geofences
organizationSchema.virtual('geofences', {
  ref: 'Geofence',
  localField: '_id',
  foreignField: 'organization'
});

// Index for efficient queries
organizationSchema.index({ status: 1 });
organizationSchema.index({ 'contact.email': 1 }, { unique: true });

// Pre-save middleware to validate email
organizationSchema.pre('save', function(next) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.contact.email)) {
    next(new Error('Invalid email format'));
  }
  next();
});

// Methods
organizationSchema.methods.updateEmployeeCount = async function() {
  const count = await mongoose.model('Employee').countDocuments({ 
    organization: this._id,
    status: 'active'
  });
  this.metadata.employeeCount = count;
  return this.save();
};

organizationSchema.methods.updateGeofenceCount = async function() {
  const count = await mongoose.model('Geofence').countDocuments({ 
    organization: this._id,
    status: 'active'
  });
  this.metadata.geofenceCount = count;
  return this.save();
};

// Statics
organizationSchema.statics.findByEmail = function(email) {
  return this.findOne({ 'contact.email': email.toLowerCase() });
};

// Add a utility function to generate a unique ID based on company name
organizationSchema.statics.generateUniqueId = async function(companyName) {
  // Take first 3 characters of company name (uppercase) or use 'ORG' if too short
  const prefix = companyName.length >= 3 
    ? companyName.substring(0, 3).toUpperCase() 
    : companyName.padEnd(3, 'X').toUpperCase();
    
  // Generate a 5-digit random number
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  
  // Combine to create a unique ID
  const candidateId = `${prefix}${randomPart}`;
  
  // Check if this ID already exists in the database
  const exists = await this.findOne({ uniqueId: candidateId });
  
  if (exists) {
    // If it exists, recursively generate a new one
    return this.generateUniqueId(companyName);
  }
  
  return candidateId;
};


const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;