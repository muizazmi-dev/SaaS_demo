const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../config/logger');

router.use(authenticate);

// GET /api/tenant — return current tenant info + stats
router.get('/', async (req, res) => {
  try {
    const [tenant] = await query(
      'SELECT id, name, slug, plan, status, created_at FROM tenants WHERE id = @tenantId',
      { tenantId: req.tenantId }
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const [stats] = await query(
      `SELECT
         (SELECT COUNT(*) FROM users     WHERE tenant_id = @tenantId) AS total_users,
         (SELECT COUNT(*) FROM customers WHERE tenant_id = @tenantId) AS total_customers`,
      { tenantId: req.tenantId }
    );

    return res.json({ tenant, stats });
  } catch (err) {
    logger.error('[tenant] Get failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch tenant info' });
  }
});

// GET /api/tenant/audit — returns last 50 audit log entries (admin only)
router.get('/audit', requireRole('admin'), async (req, res) => {
  try {
    const rows = await query(
      `SELECT al.id, al.action, al.resource_type, al.resource_id,
              al.ip_address, al.created_at, u.email AS user_email
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.tenant_id = @tenantId
       ORDER BY al.created_at DESC
       OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`,
      { tenantId: req.tenantId }
    );
    return res.json({ entries: rows });
  } catch (err) {
    logger.error('[tenant] Audit log fetch failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
