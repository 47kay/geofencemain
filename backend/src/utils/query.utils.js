// utils/query.utils.js
/**
 * Add organization filter to database query
 * @param {Object} query - The existing query object
 * @param {String} organizationId - The organization ID to filter by
 * @returns {Object} - Updated query with organization filter
 */
const withOrganizationContext = (query, organizationId) => {
    if (!organizationId) {
        throw new Error('Organization context required for data access');
    }

    return {
        ...query,
        organization: organizationId
    };
};

module.exports = { withOrganizationContext };