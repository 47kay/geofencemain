const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Address schema to reuse
const addressSchema = {
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
};

const branchSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    uniqueCode: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    address: addressSchema,
    contact: {
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        }
    },
    branchAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    metadata: {
        employeeCount: {
            type: Number,
            default: 0
        },
        departmentCount: {
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
        },
        lastModifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for employees in this branch
branchSchema.virtual('employees', {
    ref: 'Employee',
    localField: '_id',
    foreignField: 'branch'
});

// Virtual for departments in this branch
branchSchema.virtual('departments', {
    ref: 'Department',
    localField: '_id',
    foreignField: 'branch'
});

// Virtual for geofences in this branch
branchSchema.virtual('geofences', {
    ref: 'Geofence',
    localField: '_id',
    foreignField: 'branch'
});

// Indexes for better performance
branchSchema.index({ organization: 1, name: 1 }, { unique: true });
branchSchema.index({ uniqueCode: 1 }, { unique: true, sparse: true });
branchSchema.index({ organization: 1, status: 1 });
branchSchema.index({ branchAdmin: 1 });

// Update employee count method
branchSchema.methods.updateEmployeeCount = async function() {
    const count = await mongoose.model('Employee').countDocuments({
        branch: this._id,
        status: 'active'
    });

    this.metadata.employeeCount = count;
    return this.save();
};

// Update department count method
branchSchema.methods.updateDepartmentCount = async function() {
    const count = await mongoose.model('Department').countDocuments({
        branch: this._id
    });

    this.metadata.departmentCount = count;
    return this.save();
};

// Update geofence count method
branchSchema.methods.updateGeofenceCount = async function() {
    const count = await mongoose.model('Geofence').countDocuments({
        branch: this._id,
        status: 'active'
    });

    this.metadata.geofenceCount = count;
    return this.save();
};

// Generate unique code for branch
branchSchema.statics.generateUniqueCode = async function(organizationId, branchName) {
    // Get organization's unique ID prefix
    const organization = await mongoose.model('Organization').findById(organizationId, 'uniqueId');
    const orgPrefix = organization?.uniqueId?.substring(0, 2) || 'BR';

    // Take first 2 characters from branch name
    const branchPrefix = branchName.length >= 2
        ? branchName.substring(0, 2).toUpperCase()
        : branchName.padEnd(2, 'X').toUpperCase();

    // Generate random 3-digit number
    const randomPart = Math.floor(100 + Math.random() * 900);

    // Combine to create branch code
    const branchCode = `${orgPrefix}${branchPrefix}${randomPart}`;

    // Check if this code is already used
    const exists = await this.findOne({ uniqueCode: branchCode });

    if (exists) {
        // Recursively try again with a different random number
        return this.generateUniqueCode(organizationId, branchName);
    }

    return branchCode;
};

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;