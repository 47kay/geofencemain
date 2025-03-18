const Organization = require('../models/organization.model');
const User = require('../models/user.model');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Platform service for system-wide administration
 * Provides methods for cross-organization data access and management
 */
class PlatformService {
    constructor() {
        logger.info('PlatformService initialized');
    }

    /**
     * List organizations across the platform with filtering options
     */
    async listOrganizations(filters) {
        const {
            status,
            industry,
            createdAfter,
            createdBefore,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = filters;

        // Build query filters
        const query = {};

        if (status) {
            query.status = status;
        }

        if (industry) {
            query.industry = industry;
        }

        // Date range filters
        if (createdAfter || createdBefore) {
            query.createdAt = {};

            if (createdAfter) {
                query.createdAt.$gte = new Date(createdAfter);
            }

            if (createdBefore) {
                query.createdAt.$lte = new Date(createdBefore);
            }
        }

        // Validate sort parameters
        const allowedSortFields = ['name', 'createdAt', 'status', 'industry', 'userCount'];
        if (sortBy && !allowedSortFields.includes(sortBy)) {
            throw new ValidationError(`Invalid sort field. Allowed values: ${allowedSortFields.join(', ')}`);
        }

        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        // Pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const organizations = await Organization.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('adminUser', 'firstName lastName email')
            .lean();

        // Get total count for pagination metadata
        const totalCount = await Organization.countDocuments(query);

        // Get user counts for each organization
        const orgIds = organizations.map(org => org._id);
        const userCounts = await User.aggregate([
            { $match: { organization: { $in: orgIds } } },
            { $group: { _id: '$organization', count: { $sum: 1 } } }
        ]);

        // Create a map of organization ID to user count
        const userCountMap = userCounts.reduce((map, item) => {
            map[item._id.toString()] = item.count;
            return map;
        }, {});

        // Format response with enhanced data
        const formattedOrganizations = organizations.map(org => ({
            id: org._id,
            name: org.name,
            uniqueId: org.uniqueId,
            industry: org.industry,
            status: org.status,
            createdAt: org.createdAt,
            userCount: userCountMap[org._id.toString()] || 0,
            contact: {
                email: org.contact?.email,
                phone: org.contact?.phone,
                website: org.contact?.website
            },
            address: org.address ? {
                city: org.address.city,
                state: org.address.state,
                country: org.address.country
            } : null,
            admin: org.adminUser ? {
                firstName: org.adminUser.firstName,
                lastName: org.adminUser.lastName,
                email: org.adminUser.email
            } : null
        }));

        // Return paginated response
        return {
            success: true,
            organizations: formattedOrganizations,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * List users across the platform with filtering options
     */
    async listUsers(filters) {
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
        } = filters;

        // Build query filters
        const query = {};

        if (organizationId) {
            query.organization = organizationId;
        }

        if (role) {
            query.role = role;
        }

        if (status) {
            query.status = status;
        }

        // Date range filters
        if (createdAfter || createdBefore) {
            query.createdAt = {};

            if (createdAfter) {
                query.createdAt.$gte = new Date(createdAfter);
            }

            if (createdBefore) {
                query.createdAt.$lte = new Date(createdBefore);
            }
        }

        // Validate sort parameters
        const allowedSortFields = ['firstName', 'lastName', 'email', 'role', 'status', 'createdAt', 'lastLogin'];
        if (sortBy && !allowedSortFields.includes(sortBy)) {
            throw new ValidationError(`Invalid sort field. Allowed values: ${allowedSortFields.join(', ')}`);
        }

        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const sortOptions = { [sortBy]: sortDirection };

        // Pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination and populate organization details
        const users = await User.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .populate('organization', 'name uniqueId')
            .lean();

        // Get total count for pagination metadata
        const totalCount = await User.countDocuments(query);

        // Format response
        const formattedUsers = users.map(user => ({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin?.timestamp,
            organization: user.organization ? {
                id: user.organization._id,
                name: user.organization.name,
                uniqueId: user.organization.uniqueId
            } : null
        }));

        // Return paginated response
        return {
            success: true,
            users: formattedUsers,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * Get platform-wide statistics and metrics
     */
    async getPlatformStats(startDate, endDate) {
        // Date range for statistics
        const dateQuery = {};
        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
            if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
        }

        // Organization statistics
        const totalOrganizations = await Organization.countDocuments();
        const activeOrganizations = await Organization.countDocuments({ status: 'active' });
        const pendingOrganizations = await Organization.countDocuments({ status: 'pending' });

        // Get recent organizations
        const recentOrganizations = await Organization.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name industry status createdAt')
            .lean();

        // User statistics
        const totalUsers = await User.countDocuments();
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const usersByStatus = await User.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Format aggregation results into objects
        const roleStats = usersByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const statusStats = usersByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Return comprehensive statistics
        return {
            success: true,
            statistics: {
                organizations: {
                    total: totalOrganizations,
                    active: activeOrganizations,
                    pending: pendingOrganizations,
                    recent: recentOrganizations
                },
                users: {
                    total: totalUsers,
                    byRole: roleStats,
                    byStatus: statusStats
                }
            }
        };
    }
}

module.exports = PlatformService;