const PlatformService = require('../services/platform.service');
const logger = require('../utils/logger');

/**
 * Platform controller for system-wide administration
 * Handles requests for cross-organization visibility and management
 */
class PlatformController {
    constructor() {
        this.platformService = new PlatformService();
        logger.info('PlatformController initialized');
    }


    async getDashboardData(req, res, next) {
        try {
            const totalOrganizations = await Organization.countDocuments();
            const activeOrganizations = await Organization.countDocuments({ status: 'active' });
            const totalUsers = await User.countDocuments();

            // Get recent organizations
            const recentOrganizations = await Organization.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name industry status createdAt');

            // Send dashboard data
            res.json({
                success: true,
                data: {
                    statistics: {
                        organizations: {
                            total: totalOrganizations,
                            active: activeOrganizations
                        },
                        users: {
                            total: totalUsers
                        }
                    },
                    recentOrganizations
                }
            });
        } catch (error) {
            logger.error(`Error getting dashboard data: ${error.message}`);
            next(error);
        }
    }


    /**
     * List all organizations with optional filtering
     */
    async listOrganizations(req, res, next) {
        try {
            const { status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

            // Build query
            const query = {};
            if (status) query.status = status;

            // Set up sorting and pagination
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Execute query
            const organizations = await Organization.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .select('name industry status createdAt uniqueId address contact adminUser')
                .populate('adminUser', 'firstName lastName email');

            // Get total count for pagination
            const total = await Organization.countDocuments(query);

            // Send response
            res.json({
                success: true,
                organizations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error(`Error listing organizations: ${error.message}`);
            next(error);
        }
    }

    async getOrganization(req, res, next) {
        try {
            const organization = await Organization.findById(req.params.id)
                .populate('adminUser', 'firstName lastName email');

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            // Get user count for this organization
            const userCount = await User.countDocuments({ organization: organization._id });

            res.json({
                success: true,
                organization: {
                    ...organization.toObject(),
                    userCount
                }
            });
        } catch (error) {
            logger.error(`Error getting organization: ${error.message}`);
            next(error);
        }
    }

    /**
     * List users across the platform or within a specific organization
     */
    async listUsers(req, res, next) {
        try {
            // Extract query parameters
            const {
                organizationId,
                role,
                status,
                createdAfter,
                createdBefore,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                page = 1,
                limit = 20
            } = req.query;

            const filters = {
                organizationId,
                role,
                status,
                createdAfter,
                createdBefore,
                sortBy,
                sortOrder,
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await this.platformService.listUsers(filters);

            logger.info(`Retrieved ${result.users.length} users matching filters`);
            res.json(result);
        } catch (error) {
            logger.error(`Platform user listing failed: ${error.message}`);
            next(error);
        }
    }

    /**
     * Get platform-wide statistics and metrics
     */
    async getPlatformStats(req, res, next) {
        try {
            const { startDate, endDate } = req.query;

            const stats = await this.platformService.getPlatformStats(startDate, endDate);

            logger.info('Retrieved platform-wide statistics');
            res.json(stats);
        } catch (error) {
            logger.error(`Platform statistics retrieval failed: ${error.message}`);
            next(error);
        }
    }





}

module.exports = PlatformController;


// controllers/platform.controller.js
// const Organization = require('../models/organization.model');
// const User = require('../models/user.model');
// const logger = require('../utils/logger');
//
// class PlatformController {
//     // Dashboard data for platform administrators
//     async getDashboardData(req, res, next) {
//         try {
//             const totalOrganizations = await Organization.countDocuments();
//             const activeOrganizations = await Organization.countDocuments({ status: 'active' });
//             const totalUsers = await User.countDocuments();
//
//             // Get recent organizations
//             const recentOrganizations = await Organization.find()
//                 .sort({ createdAt: -1 })
//                 .limit(5)
//                 .select('name industry status createdAt');
//
//             // Send dashboard data
//             res.json({
//                 success: true,
//                 data: {
//                     statistics: {
//                         organizations: {
//                             total: totalOrganizations,
//                             active: activeOrganizations
//                         },
//                         users: {
//                             total: totalUsers
//                         }
//                     },
//                     recentOrganizations
//                 }
//             });
//         } catch (error) {
//             logger.error(`Error getting dashboard data: ${error.message}`);
//             next(error);
//         }
//     }
//
//     // List all organizations
//     async listOrganizations(req, res, next) {
//         try {
//             const { status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
//
//             // Build query
//             const query = {};
//             if (status) query.status = status;
//
//             // Set up sorting and pagination
//             const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
//             const skip = (parseInt(page) - 1) * parseInt(limit);
//
//             // Execute query
//             const organizations = await Organization.find(query)
//                 .sort(sort)
//                 .skip(skip)
//                 .limit(parseInt(limit))
//                 .select('name industry status createdAt uniqueId address contact adminUser')
//                 .populate('adminUser', 'firstName lastName email');
//
//             // Get total count for pagination
//             const total = await Organization.countDocuments(query);
//
//             // Send response
//             res.json({
//                 success: true,
//                 organizations,
//                 pagination: {
//                     page: parseInt(page),
//                     limit: parseInt(limit),
//                     total,
//                     pages: Math.ceil(total / parseInt(limit))
//                 }
//             });
//         } catch (error) {
//             logger.error(`Error listing organizations: ${error.message}`);
//             next(error);
//         }
//     }
//
//     // Get organization details
//     async getOrganization(req, res, next) {
//         try {
//             const organization = await Organization.findById(req.params.id)
//                 .populate('adminUser', 'firstName lastName email');
//
//             if (!organization) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Organization not found'
//                 });
//             }
//
//             // Get user count for this organization
//             const userCount = await User.countDocuments({ organization: organization._id });
//
//             res.json({
//                 success: true,
//                 organization: {
//                     ...organization.toObject(),
//                     userCount
//                 }
//             });
//         } catch (error) {
//             logger.error(`Error getting organization: ${error.message}`);
//             next(error);
//         }
//     }
//
//     // Additional methods would be implemented here...
// }
//
// module.exports = new PlatformController();