// controllers/admin.controller.js
const Organization = require('../models/organization.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

class AdminController {
    /**
     * List all organizations across the platform
     * Restricted to platform administrators only
     */
    async listAllOrganizations(req, res, next) {
        try {
            logger.info('Request received to list all organizations');

            // Retrieve all organizations with basic information
            const organizations = await Organization.find()
                .select('name uniqueId industry status createdAt contact address')
                .sort({ createdAt: -1 })
                .lean();

            // Get user counts for each organization
            const orgIds = organizations.map(org => org._id);
            const userCounts = await User.aggregate([
                { $match: { organization: { $in: orgIds } } },
                { $group: { _id: '$organization', count: { $sum: 1 } } }
            ]);

            // Map user counts to organizations
            const userCountMap = userCounts.reduce((map, item) => {
                map[item._id.toString()] = item.count;
                return map;
            }, {});

            // Format the response
            const formattedOrganizations = organizations.map(org => ({
                id: org._id,
                name: org.name,
                uniqueId: org.uniqueId,
                industry: org.industry,
                status: org.status,
                createdAt: org.createdAt,
                userCount: userCountMap[org._id.toString()] || 0,
                contact: org.contact ? {
                    email: org.contact.email,
                    phone: org.contact.phone
                } : null,
                address: org.address ? {
                    city: org.address.city,
                    state: org.address.state,
                    country: org.address.country
                } : null
            }));

            logger.info(`Retrieved ${organizations.length} organizations`);

            // Return success response
            res.json({
                success: true,
                count: organizations.length,
                organizations: formattedOrganizations
            });
        } catch (error) {
            logger.error(`Failed to list organizations: ${error.message}`);
            next(error);
        }
    }

    // controllers/admin.controller.js
    async registerPlatformAdmin(req, res, next) {
        try {
            // Only existing platform admins can create new ones
            if (req.user.role !== 'platform_admin') {
                return res.status(403).json({
                    status: "error",
                    code: "FORBIDDEN",
                    message: "Only platform administrators can register new platform admins"
                });
            }

            const { email, firstName, lastName, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    status: "error",
                    code: "CONFLICT",
                    message: "User with this email already exists"
                });
            }

            // Create new platform admin
            const newAdmin = new User({
                email,
                firstName,
                lastName,
                password, // Should be hashed in the User model's pre-save hook
                role: 'platform_admin',
                status: 'active',
                createdBy: req.user.id
            });

            await newAdmin.save();

            // Log activity
            logger.info(`New platform admin registered: ${email} by ${req.user.email}`);

            // Return success response (without password)
            const adminData = newAdmin.toObject();
            delete adminData.password;

            res.status(201).json({
                status: "success",
                message: "Platform administrator registered successfully",
                admin: adminData
            });
        } catch (error) {
            logger.error(`Platform admin registration failed: ${error.message}`);
            next(error);
        }
    }


    // controllers/admin.controller.js
    async invitePlatformAdmin(req, res, next) {
        try {
            // Verify platform admin privileges
            if (req.user.role !== 'platform_admin') {
                return res.status(403).json({
                    status: "error",
                    code: "FORBIDDEN",
                    message: "Only platform administrators can invite new platform admins"
                });
            }

            const { email } = req.body;

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Store invitation in database
            const invitation = new AdminInvitation({
                email,
                token,
                invitedBy: req.user.id,
                expiresAt
            });

            await invitation.save();

            // Send invitation email
            await sendPlatformAdminInvitationEmail(email, token);

            res.status(201).json({
                status: "success",
                message: "Platform administrator invitation sent"
            });
        } catch (error) {
            logger.error(`Platform admin invitation failed: ${error.message}`);
            next(error);
        }
    }

    async completePlatformAdminRegistration(req, res, next) {
        try {
            const { token, firstName, lastName, password } = req.body;

            // Find valid invitation
            const invitation = await AdminInvitation.findOne({
                token,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });

            if (!invitation) {
                return res.status(404).json({
                    status: "error",
                    code: "NOT_FOUND",
                    message: "Invalid or expired invitation"
                });
            }

            // Create new platform admin
            const newAdmin = new User({
                email: invitation.email,
                firstName,
                lastName,
                password, // Should be hashed in the User model's pre-save hook
                role: 'platform_admin',
                status: 'active',
                createdBy: invitation.invitedBy
            });

            await newAdmin.save();

            // Update invitation status
            invitation.status = 'accepted';
            await invitation.save();

            // Return success response
            const adminData = newAdmin.toObject();
            delete adminData.password;

            res.status(201).json({
                status: "success",
                message: "Platform administrator registration completed",
                admin: adminData
            });
        } catch (error) {
            logger.error(`Platform admin registration completion failed: ${error.message}`);
            next(error);
        }
    }



}

module.exports = new AdminController();