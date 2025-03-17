const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invitationSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'user']
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  additionalData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, { 
  timestamps: true 
});

// Create indexes for faster lookups and tenant isolation
invitationSchema.index({ email: 1, organizationId: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ status: 1, organizationId: 1 });
invitationSchema.index({ createdBy: 1, organizationId: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);