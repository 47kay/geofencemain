// create-platform-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/user.model');

async function createPlatformAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        const existingAdmin = await User.findOne({ role: 'platform_superadmin' });
        if (existingAdmin) {
            console.log('Platform admin already exists:', existingAdmin.email);
            return;
        }

        const admin = new User({
            email: 'platform-admin@yourcompany.com',
            firstName: 'Platform',
            lastName: 'Administrator',
            password: 'SecurePassword123!', // Will be hashed by the pre-save hook
            role: 'platform_superadmin',
            status: 'active',
            verification: {
                verified: true
            }
            // No organization required for platform admins
        });

        await admin.save();
        console.log('Platform admin created successfully:', admin.email);
    } catch (error) {
        console.error('Failed to create platform admin:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createPlatformAdmin();