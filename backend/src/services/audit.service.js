const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AuditService {
  constructor() {
    // Check if AuditLog model exists
    this.AuditLog = mongoose.models.AuditLog || 
      mongoose.model('AuditLog', new mongoose.Schema({
        action: String,
        userId: mongoose.Schema.Types.ObjectId,
        organizationId: mongoose.Schema.Types.ObjectId,
        resource: String,
        resourceId: mongoose.Schema.Types.ObjectId,
        details: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now }
      }, { 
        timestamps: true 
      }));
      
    logger.info('AuditService initialized');
  }

  /**
   * Log an activity
   * @param {Object} activityData - Activity data
   * @returns {Promise<void>}
   */
  async logActivity(activityData) {
    const { action, userId, organizationId, resource, resourceId, details } = activityData;
    
    try {
      // Create audit log entry
      const auditLog = new this.AuditLog({
        action,
        userId,
        organizationId,
        resource,
        resourceId,
        details,
        timestamp: new Date()
      });
      
      await auditLog.save();
      logger.debug(`Audit log created: ${action} by ${userId}`);
    } catch (error) {
      // Log error but don't fail the operation
      logger.error(`Failed to create audit log: ${error.message}`);
    }
  }
}

module.exports = AuditService;