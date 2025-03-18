// set-platform-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function setPlatformAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Connect to the users collection directly to bypass middleware
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const email = 'super@temitopejosh.com';
        const newPassword = 'Admin123456!';

        // Find user first
        const user = await usersCollection.findOne({ email });

        if (!user) {
            console.log('User not found, creating platform admin...');

            // Generate password hash with 12 rounds of salting
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Create new platform admin
            const newAdmin = {
                email,
                firstName: 'Platform',
                lastName: 'Admin',
                password: hashedPassword,
                role: 'platform_superadmin',
                status: 'active',
                verification: {
                    verified: true
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await usersCollection.insertOne(newAdmin);
            console.log('Created new platform admin:', result.insertedId);
        } else {
            console.log('User found, updating password...');

            // Generate password hash with 12 rounds of salting
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update user's password directly
            const result = await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        password: hashedPassword,
                        role: 'platform_superadmin',
                        status: 'active',
                        'verification.verified': true,
                        updatedAt: new Date()
                    }
                }
            );

            console.log('Updated platform admin password:', result.modifiedCount > 0);
        }

        console.log('------------------------------------');
        console.log('Platform admin credentials:');
        console.log('Email:', email);
        console.log('Password:', newPassword);
        console.log('------------------------------------');
        console.log('Use these credentials to log in.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
    }
}

setPlatformAdmin();