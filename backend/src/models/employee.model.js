const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
  // User reference for authentication
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Organization reference
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Employee identification
  employeeId: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },

  // Personal information
  personalInfo: {
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    }
  },

  // Employment details
  employmentDetails: {
    department: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    workSchedule: {
      type: {
        type: String,
        enum: ['fixed', 'flexible', 'shifts'],
        default: 'fixed'
      },
      hours: {
        start: String,
        end: String
      },
      workDays: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }
    }
  },

  // Attendance tracking
  attendance: {
    lastCheckIn: {
      timestamp: Date,
      geofence: {
        type: Schema.Types.ObjectId,
        ref: 'Geofence'
      },
      location: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      }
    },
    lastCheckOut: {
      timestamp: Date,
      geofence: {
        type: Schema.Types.ObjectId,
        ref: 'Geofence'
      },
      location: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      }
    },
    currentStatus: {
      type: String,
      enum: ['checked-in', 'checked-out', 'on-break'],
      default: 'checked-out'
    }
  },

  // Employee preferences and settings
  settings: {
    locationTracking: {
      type: Boolean,
      default: true
    },
    notifications: {
      checkIn: {
        type: Boolean,
        default: true
      },
      checkOut: {
        type: Boolean,
        default: true
      },
      schedule: {
        type: Boolean,
        default: true
      }
    },
    autoCheckIn: {
      type: Boolean,
      default: false
    }
  },

  // Employment status
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active',
    index: true
  },

  // Metadata and statistics
  metadata: {
    totalWorkHours: {
      type: Number,
      default: 0
    },
    averageCheckInTime: String,
    averageCheckOutTime: String,
    lastLocationUpdate: Date,
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

// Indexes for performance
employeeSchema.index({ organization: 1, status: 1 });
employeeSchema.index({ employeeId: 1 }, { unique: true });
employeeSchema.index({ 'attendance.lastCheckIn.location.coordinates': '2dsphere' });

// Virtual relationships
employeeSchema.virtual('assignedGeofences', {
  ref: 'Geofence',
  localField: '_id',
  foreignField: 'assignedEmployees.employee'
});

employeeSchema.virtual('attendanceRecords', {
  ref: 'AttendanceRecord',
  localField: '_id',
  foreignField: 'employee'
});

// Instance methods
employeeSchema.methods = {
  // Handle check-in process
  async checkIn(geofenceId, location) {
    this.attendance.lastCheckIn = {
      timestamp: new Date(),
      geofence: geofenceId,
      location: {
        type: 'Point',
        coordinates: location
      }
    };
    this.attendance.currentStatus = 'checked-in';
    return this.save();
  },

  // Handle check-out process
  async checkOut(geofenceId, location) {
    this.attendance.lastCheckOut = {
      timestamp: new Date(),
      geofence: geofenceId,
      location: {
        type: 'Point',
        coordinates: location
      }
    };
    this.attendance.currentStatus = 'checked-out';
    return this.save();
  },

  // Update employee location
  async updateLocation(coordinates) {
    this.metadata.lastLocationUpdate = new Date();
    if (this.attendance.currentStatus === 'checked-in') {
      this.attendance.lastCheckIn.location.coordinates = coordinates;
    }
    return this.save();
  },

  // Calculate total work hours for a date range
  async calculateWorkHours(startDate, endDate) {
    const records = await mongoose.model('AttendanceRecord').find({
      employee: this._id,
      checkIn: { $gte: startDate, $lte: endDate }
    });
    
    let totalHours = 0;
    records.forEach(record => {
      if (record.checkOut) {
        const duration = record.checkOut - record.checkIn;
        totalHours += duration / (1000 * 60 * 60); // Convert to hours
      }
    });
    
    return totalHours;
  },

  // Update work schedule
  async updateWorkSchedule(schedule) {
    this.employmentDetails.workSchedule = {
      ...this.employmentDetails.workSchedule,
      ...schedule
    };
    return this.save();
  },

  // Request leave
  async requestLeave(startDate, endDate, reason) {
    // This would typically create a leave request record
    // and update the employee status once approved
    this.status = 'on_leave';
    return this.save();
  }
};

// Static methods
employeeSchema.statics = {
  // Find employees currently in a specific geofence
  findByGeofence(geofenceId) {
    return this.find({
      'attendance.currentStatus': 'checked-in',
      'attendance.lastCheckIn.geofence': geofenceId
    });
  },

  // Find active employees in an organization
  findActiveInOrganization(organizationId) {
    return this.find({
      organization: organizationId,
      status: 'active'
    });
  },

  // Get employee attendance statistics
  async getAttendanceStats(employeeId, startDate, endDate) {
    const records = await mongoose.model('AttendanceRecord').find({
      employee: employeeId,
      checkIn: { $gte: startDate, $lte: endDate }
    });

    return {
      totalDays: records.length,
      onTime: records.filter(r => r.isOnTime).length,
      late: records.filter(r => !r.isOnTime).length,
      averageHours: records.reduce((acc, r) => acc + r.duration, 0) / records.length
    };
  }
};

employeeSchema.statics.findByIdWithinOrganization = function(id, organizationId) {
  return this.findOne({
    _id: id,
    organization: organizationId
  });
};

employeeSchema.statics.findAllWithinOrganization = function(query, organizationId) {
  return this.find({
    ...query,
    organization: organizationId
  });
};

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;