// scripts/create-platform-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/user.model');

async function createPlatformAdmin() {
    try {
        // Connect to your MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Get admin details from command line or environment variables
        const email = process.argv[2] || process.env.ADMIN_EMAIL || 'platform-admin@example.com';
        const firstName = process.argv[3] || process.env.ADMIN_FIRST_NAME || 'Platform';
        const lastName = process.argv[4] || process.env.ADMIN_LAST_NAME || 'Admin';
        const password = process.argv[5] || process.env.ADMIN_PASSWORD || 'ChangeMe123!';

        // Check if platform admin already exists
        const existingAdmin = await User.findOne({
            email,
            role: { $in: ['platform_superadmin', 'platform_admin'] }
        });

        if (existingAdmin) {
            console.log('Platform admin already exists:', existingAdmin.email);
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the platform admin user
        const admin = new User({
            email,
            firstName,
            lastName,
            password: hashedPassword,
            role: 'platform_superadmin',
            status: 'active',
            verification: {
                verified: true
            }
            // No organization required for platform admins
        });

        await admin.save();

        console.log('Platform admin created successfully:');
        console.log('- Email:', admin.email);
        console.log('- Name:', admin.firstName, admin.lastName);
        console.log('- Role:', admin.role);
    } catch (error) {
        console.error('Failed to create platform admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
    }

    // In create-platform-admin.js, add this function:
    async function updatePlatformAdminPassword() {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to database');

            const email = process.argv[2];
            const newPassword = process.argv[3];

            const user = await User.findOne({ email });
            if (!user) {
                console.log('User not found:', email);
                return;
            }

            // Update password
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            user.password = hashedPassword;
            await user.save();

            console.log('Password updated successfully for:', email);
        } catch (error) {
            console.error('Failed to update password:', error);
        } finally {
            await mongoose.disconnect();
        }
    }

// Call this function instead
    updatePlatformAdminPassword();
}

createPlatformAdmin();