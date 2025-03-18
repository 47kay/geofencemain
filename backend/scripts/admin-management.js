// scripts/admin-management.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('../../backend/src/models/user.model'); // Adjust path as needed

// Create readline interface for interactive input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Connect to database
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
}

// Create a platform admin
async function createPlatformAdmin() {
    console.log('\n=== Create Platform Administrator ===\n');

    // Collect admin information
    const email = await question('Email: ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const password = await question('Password: ');
    const role = await question('Role (platform_admin or platform_superadmin): ');

    // Validate input
    if (!email || !firstName || !lastName || !password) {
        console.error('All fields are required');
        return;
    }

    if (role !== 'platform_admin' && role !== 'platform_superadmin') {
        console.error('Role must be platform_admin or platform_superadmin');
        return;
    }

    try {
        // Check if admin exists
        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists with this email.');
            return;
        }

        // Create admin
        const admin = new User({
            email,
            firstName,
            lastName,
            password, // Will be hashed by pre-save hook
            role,
            status: 'active',
            verification: {
                verified: true
            }
        });

        await admin.save();
        console.log('\nPlatform admin created successfully!');
    } catch (error) {
        console.error('Error creating admin:', error.message);
    }
}

// List all platform admins
async function listPlatformAdmins() {
    console.log('\n=== Platform Administrators ===\n');

    try {
        const admins = await User.find({
            role: { $in: ['platform_admin', 'platform_superadmin'] }
        }).select('email firstName lastName role status createdAt');

        if (admins.length === 0) {
            console.log('No platform administrators found');
            return;
        }

        admins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Status: ${admin.status}`);
            console.log(`   Created: ${admin.createdAt}`);
            console.log('');
        });
    } catch (error) {
        console.error('Error listing admins:', error.message);
    }
}

// Reset password for platform admin
async function resetAdminPassword() {
    console.log('\n=== Reset Administrator Password ===\n');

    const email = await question('Admin Email: ');
    const newPassword = await question('New Password: ');

    try {
        const admin = await User.findOne({
            email,
            role: { $in: ['platform_admin', 'platform_superadmin'] }
        });

        if (!admin) {
            console.log('Platform administrator not found with this email');
            return;
        }

        admin.password = newPassword; // Will be hashed by pre-save hook
        await admin.save();

        console.log('\nPassword reset successfully');
    } catch (error) {
        console.error('Error resetting password:', error.message);
    }
}

// Utility function for prompts
function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, answer => {
            resolve(answer);
        });
    });
}

// Main menu
async function showMenu() {
    console.log('\n=== Platform Administration Tool ===');
    console.log('1. Create Platform Administrator');
    console.log('2. List Platform Administrators');
    console.log('3. Reset Administrator Password');
    console.log('4. Exit');

    const choice = await question('\nSelect an option (1-4): ');

    switch (choice) {
        case '1':
            await createPlatformAdmin();
            break;
        case '2':
            await listPlatformAdmins();
            break;
        case '3':
            await resetAdminPassword();
            break;
        case '4':
            console.log('Exiting...');
            rl.close();
            await mongoose.disconnect();
            process.exit(0);
            break;
        default:
            console.log('Invalid option, please try again');
    }

    // Return to menu
    await showMenu();
}

// Run the tool
async function run() {
    const connected = await connectDB();
    if (connected) {
        await showMenu();
    } else {
        rl.close();
        process.exit(1);
    }
}

// Start the application
run();