const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Logs mutating requests (POST, PUT, PATCH, DELETE) to audit_log table.
 * Call after authenticate() so tenantId and userId are available.
 */
function auditLog(resourceType) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || body?.id || null;
        query(
          `INSERT INTO audit_log (id, tenant_id, user_id, action, resource_type, resource_id, details, ip_address)
           VALUES (@id, @tenantId, @userId, @action, @resourceType, @resourceId, @details, @ip)`,
          {
            id: uuidv4(),
            tenantId: req.tenantId,
            userId: req.userId || null,
            action: req.method,
            resourceType,
            resourceId,
            details: JSON.stringify({ path: req.path, body: req.body }),
            ip: req.ip,
          }
        ).catch((err) => logger.error('[audit] Failed to write audit log', { error: err.message }));
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditLog };
