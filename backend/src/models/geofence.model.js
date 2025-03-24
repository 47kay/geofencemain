const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const geofenceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 50,  // minimum 50 meters
    max: 10000  // maximum 10 kilometers
  },
  type: {
    type: String,
    enum: ['office', 'site', 'warehouse', 'custom'],
    default: 'custom'
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    workDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    workHours: {
      start: String,
      end: String
    }
  },
  settings: {
    entryNotification: {
      type: Boolean,
      default: true
    },
    exitNotification: {
      type: Boolean,
      default: true
    },
    autoCheckIn: {
      type: Boolean,
      default: false
    },
    graceperiod: {
      type: Number,
      default: 5,  // 5 minutes
      min: 0,
      max: 60
    }
  },
  assignedEmployees: [{
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    activeEmployeeCount: {
      type: Number,
      default: 0
    },
    totalCheckIns: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
geofenceSchema.index({ 'location.coordinates': '2dsphere' });
geofenceSchema.index({ organization: 1, status: 1 });
geofenceSchema.index({ 'assignedEmployees.employee': 1 });

// Virtual for getting attendance records
geofenceSchema.virtual('attendance', {
  ref: 'AttendanceRecord',
  localField: '_id',
  foreignField: 'geofence'
});

// Methods
geofenceSchema.methods.isPointInside = function(coordinates) {
  const earthRadius = 6371000; // Earth's radius in meters
  
  // Calculate distance using Haversine formula
  const [lat1, lon1] = this.location.coordinates;
  const [lat2, lon2] = coordinates;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = earthRadius * c;
  
  return distance <= this.radius;
};

geofenceSchema.methods.assignEmployee = async function(employeeId, assignedBy) {
  if (!this.assignedEmployees.find(ae => ae.employee.equals(employeeId))) {
    this.assignedEmployees.push({
      employee: employeeId,
      assignedBy
    });
    await this.save();
    await this.updateActiveEmployeeCount();
  }
  return this;
};

geofenceSchema.methods.removeEmployee = async function(employeeId) {
  this.assignedEmployees = this.assignedEmployees.filter(
    ae => !ae.employee.equals(employeeId)
  );
  await this.save();
  await this.updateActiveEmployeeCount();
  return this;
};

geofenceSchema.methods.updateActiveEmployeeCount = async function() {
  const count = this.assignedEmployees.length;
  this.metadata.activeEmployeeCount = count;
  return this.save();
};

geofenceSchema.methods.incrementCheckIns = async function() {
  this.metadata.totalCheckIns += 1;
  return this.save();
};

// Statics
geofenceSchema.statics.findNearby = function(coordinates, maxDistance) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active'
  });
};

geofenceSchema.statics.findByEmployee = function(employeeId) {
  return this.find({
    'assignedEmployees.employee': employeeId,
    status: 'active'
  });
};

const Geofence = mongoose.model('Geofence', geofenceSchema);

module.exports = Geofence;