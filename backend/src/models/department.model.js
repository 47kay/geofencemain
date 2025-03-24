const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  parentDepartmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Organization.branches',
    default: null
  }
}, { 
  timestamps: true 
});

// Create indexes for faster lookups
departmentSchema.index({ name: 1, organizationId: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1 });

// Virtual reference to parent department
departmentSchema.virtual('parentDepartment', {
  ref: 'Department',
  localField: 'parentDepartmentId',
  foreignField: '_id',
  justOne: true
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;