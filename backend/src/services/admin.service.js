// In a new file: services/admin.service.js
const User = require('../models/user.model');
const Branch = require('../models/branch.model');
const logger = require('../utils/logger');

class AdminService {
    /**
     * Get users who can be assigned as branch admins
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Array>} - List of potential admin users
     */
    async getPotentialAdmins(organizationId) {
        return User.find({
            organization: organizationId,
            role: { $in: ['admin', 'user', 'manager'] }
        })
            .select('_id firstName lastName email role')
            .sort({ firstName: 1, lastName: 1 });
    }

    /**
     * Get admin assignment options
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>} - Assignment options
     */
    async getAdminAssignmentOptions(organizationId) {
        try {
            // Break this into smaller, more focused queries
            const potentialAdminsPromise = this.getPotentialAdmins(organizationId);

            const branchesPromise = Branch.find({ organization: organizationId })
                .select('_id name status branchAdmin')
                .populate('branchAdmin', 'firstName lastName email')
                .sort({ name: 1 });

            // Execute queries in parallel
            const [potentialAdmins, branches] = await Promise.all([
                potentialAdminsPromise,
                branchesPromise
            ]);

            // Process results
            const admins = potentialAdmins.filter(user => user.role === 'admin');
            const nonAdmins = potentialAdmins.filter(user => user.role !== 'admin');

            const branchesWithAdmin = branches.filter(branch => branch.branchAdmin);
            const branchesWithoutAdmin = branches.filter(branch => !branch.branchAdmin);

            return {
                admins: {
                    existingAdmins: admins,
                    potentialAdmins: nonAdmins
                },
                branches: {
                    all: branches,
                    withAdmin: branchesWithAdmin,
                    withoutAdmin: branchesWithoutAdmin
                }
            };
        } catch (error) {
            logger.error(`Error fetching admin assignment options: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new AdminService();