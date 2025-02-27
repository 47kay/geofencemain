const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },

  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  geofence: {
    type: Schema.Types.ObjectId,
    ref: 'Geofence',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['check-in', 'check-out', 'break-start', 'break-end'],
    required: true
  },

  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
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
    }
  },

  // For check-in records
  checkInDetails: {
    schedule: {
      startTime: String,
      endTime: String
    },
    isOnTime: {
      type: Boolean,
      default: true
    },
    lateMinutes: {
      type: Number,
      default: 0
    }
  },

  // For check-out records
  checkOutDetails: {
    totalHours: Number,
    overtime: Number,
    earlyDeparture: Boolean
  },

  // Break records
  breakDetails: {
    duration: Number, // in minutes
    reason: String
  },

  // Device information
  device: {
    deviceId: String,
    deviceType: String,
    browser: String,
    ip: String,
    userAgent: String
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // For manual records or corrections
  modification: {
    isModified: {
      type: Boolean,
      default: false
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: Date,
    reason: String,
    originalTimestamp: Date
  },

  notes: {
    type: String,
    trim: true
  },

  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    source: {
      type: String,
      enum: ['auto', 'manual', 'system'],
      default: 'auto'
    }
  }
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ 'location.coordinates': '2dsphere' });
attendanceSchema.index({ employee: 1, timestamp: -1 });
attendanceSchema.index({ organization: 1, timestamp: -1 });
attendanceSchema.index({ geofence: 1, timestamp: -1 });
attendanceSchema.index({ type: 1, status: 1 });

// Virtuals
attendanceSchema.virtual('duration').get(function() {
  if (this.type === 'check-out' && this.checkOutDetails) {
    return this.checkOutDetails.totalHours;
  }
  return 0;
});

// Methods
attendanceSchema.methods = {
  /**
   * Calculate work duration in hours
   */
  async calculateWorkDuration() {
    if (this.type !== 'check-out') return 0;

    const checkIn = await this.model('Attendance').findOne({
      employee: this.employee,
      type: 'check-in',
      timestamp: { $lt: this.timestamp },
      status: 'approved'
    }).sort({ timestamp: -1 });

    if (!checkIn) return 0;

    const duration = (this.timestamp - checkIn.timestamp) / (1000 * 60 * 60); // Convert to hours
    return Math.round(duration * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Check if attendance is during work hours
   */
  isWithinWorkHours() {
    if (!this.checkInDetails?.schedule) return true;

    const timestamp = this.timestamp;
    const [startHour, startMinute] = this.checkInDetails.schedule.startTime.split(':');
    const [endHour, endMinute] = this.checkInDetails.schedule.endTime.split(':');

    const startTime = new Date(timestamp);
    startTime.setHours(parseInt(startHour), parseInt(startMinute), 0);

    const endTime = new Date(timestamp);
    endTime.setHours(parseInt(endHour), parseInt(endMinute), 0);

    return timestamp >= startTime && timestamp <= endTime;
  },

  /**
   * Calculate late minutes
   */
  calculateLateMinutes() {
    if (this.type !== 'check-in' || !this.checkInDetails?.schedule) return 0;

    const [scheduleHour, scheduleMinute] = this.checkInDetails.schedule.startTime.split(':');
    const scheduleTime = new Date(this.timestamp);
    scheduleTime.setHours(parseInt(scheduleHour), parseInt(scheduleMinute), 0);

    if (this.timestamp <= scheduleTime) return 0;

    const lateMinutes = Math.floor((this.timestamp - scheduleTime) / (1000 * 60));
    return lateMinutes;
  }
};

// Statics
attendanceSchema.statics = {
  /**
   * Get employee's attendance for date range
   */
  async getEmployeeAttendance(employeeId, startDate, endDate) {
    return this.find({
      employee: employeeId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'approved'
    }).sort({ timestamp: 1 });
  },

  /**
   * Get attendance statistics for organization
   */
  async getOrganizationStats(organizationId, startDate, endDate) {
    const stats = await this.aggregate([
      {
        $match: {
          organization: organizationId,
          timestamp: { $gte: startDate, $lte: endDate },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          onTime: {
            $sum: { $cond: [{ $eq: ['$checkInDetails.isOnTime', true] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$checkInDetails.isOnTime', false] }, 1, 0] }
          },
          totalLateMinutes: { $sum: '$checkInDetails.lateMinutes' },
          totalWorkHours: { $sum: '$checkOutDetails.totalHours' }
        }
      }
    ]);

    return stats;
  }
};

// Pre-save middleware
attendanceSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Calculate late minutes for check-ins
    if (this.type === 'check-in') {
      this.checkInDetails.lateMinutes = this.calculateLateMinutes();
      this.checkInDetails.isOnTime = this.checkInDetails.lateMinutes === 0;
    }

    // Calculate work duration for check-outs
    if (this.type === 'check-out') {
      this.checkOutDetails = this.checkOutDetails || {};
      this.checkOutDetails.totalHours = await this.calculateWorkDuration();
    }
  }
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;