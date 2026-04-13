const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { body, param, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const logger = require('../config/logger');

// All customer routes require authentication
router.use(authenticate);

// GET /api/customers — list all customers for the authenticated tenant
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, email, phone, company, status, created_at
       FROM customers
       WHERE tenant_id = @tenantId
       ORDER BY created_at DESC`,
      { tenantId: req.tenantId }
    );
    return res.json({ customers: rows, total: rows.length });
  } catch (err) {
    logger.error('[customers] List failed', { tenantId: req.tenantId, error: err.message });
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id — get single customer (must belong to same tenant)
router.get(
  '/:id',
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      const rows = await query(
        `SELECT id, name, email, phone, company, status, created_at, updated_at
         FROM customers
         WHERE id = @id AND tenant_id = @tenantId`,
        { id: req.params.id, tenantId: req.tenantId }
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
      return res.json(rows[0]);
    } catch (err) {
      logger.error('[customers] Get failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }
);

// POST /api/customers — create customer scoped to authenticated tenant
router.post(
  '/',
  auditLog('customer'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().trim(),
    body('company').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, phone, company } = req.body;
    const id = uuidv4();

    try {
      await query(
        `INSERT INTO customers (id, tenant_id, name, email, phone, company, status)
         VALUES (@id, @tenantId, @name, @email, @phone, @company, 'active')`,
        { id, tenantId: req.tenantId, name, email, phone: phone || null, company: company || null }
      );

      const rows = await query(
        'SELECT * FROM customers WHERE id = @id AND tenant_id = @tenantId',
        { id, tenantId: req.tenantId }
      );

      logger.info('[customers] Created', { tenantId: req.tenantId, customerId: id });
      return res.status(201).json(rows[0]);
    } catch (err) {
      logger.error('[customers] Create failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

// PUT /api/customers/:id — update customer (tenant-scoped)
router.put(
  '/:id',
  auditLog('customer'),
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, phone, company, status } = req.body;
    try {
      const result = await query(
        `UPDATE customers
         SET name = COALESCE(@name, name),
             email = COALESCE(@email, email),
             phone = COALESCE(@phone, phone),
             company = COALESCE(@company, company),
             status = COALESCE(@status, status),
             updated_at = GETUTCDATE()
         WHERE id = @id AND tenant_id = @tenantId`,
        { id: req.params.id, tenantId: req.tenantId, name, email, phone, company, status }
      );

      const rows = await query(
        'SELECT * FROM customers WHERE id = @id AND tenant_id = @tenantId',
        { id: req.params.id, tenantId: req.tenantId }
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

      return res.json(rows[0]);
    } catch (err) {
      logger.error('[customers] Update failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to update customer' });
    }
  }
);

// DELETE /api/customers/:id
router.delete(
  '/:id',
  auditLog('customer'),
  [param('id').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    try {
      await query(
        'DELETE FROM customers WHERE id = @id AND tenant_id = @tenantId',
        { id: req.params.id, tenantId: req.tenantId }
      );
      return res.json({ message: 'Customer deleted', id: req.params.id });
    } catch (err) {
      logger.error('[customers] Delete failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
  }
);

module.exports = router;
