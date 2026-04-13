const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// POST /api/auth/signup
// Creates a new tenant + first admin user in a single transaction
router.post(
  '/signup',
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { companyName, email, password, fullName } = req.body;

    // Generate a URL-safe slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);

    try {
      const result = await withTransaction(async (txQuery) => {
        // Check slug uniqueness
        const existing = await txQuery(
          'SELECT id FROM tenants WHERE slug = @slug',
          { slug }
        );
        if (existing.length > 0) {
          throw Object.assign(new Error('Company name already taken'), { code: 'SLUG_TAKEN' });
        }

        // Check email uniqueness across all tenants (optional — remove if you want same email on multiple tenants)
        const emailExists = await txQuery(
          'SELECT id FROM users WHERE email = @email',
          { email }
        );
        if (emailExists.length > 0) {
          throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_TAKEN' });
        }

        const tenantId = uuidv4();
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 12);

        // Create tenant
        await txQuery(
          `INSERT INTO tenants (id, name, slug, plan, status)
           VALUES (@id, @name, @slug, 'free', 'active')`,
          { id: tenantId, name: companyName, slug }
        );

        // Create admin user
        await txQuery(
          `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
           VALUES (@id, @tenantId, @email, @passwordHash, @fullName, 'admin')`,
          { id: userId, tenantId, email, passwordHash, fullName }
        );

        return { tenantId, userId, slug };
      });

      const token = jwt.sign(
        { userId: result.userId, tenantId: result.tenantId, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info('[auth] New tenant registered', { tenantId: result.tenantId, slug: result.slug });

      return res.status(201).json({
        token,
        user: { id: result.userId, email, fullName, role: 'admin' },
        tenant: { id: result.tenantId, name: companyName, slug: result.slug, plan: 'free' },
      });
    } catch (err) {
      if (err.code === 'SLUG_TAKEN') return res.status(409).json({ error: err.message });
      if (err.code === 'EMAIL_TAKEN') return res.status(409).json({ error: err.message });
      logger.error('[auth] Signup failed', { error: err.message });
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const rows = await query(
        `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role,
                t.name AS tenant_name, t.slug, t.plan
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         WHERE u.email = @email AND t.status = 'active'`,
        { email }
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenant_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info('[auth] User logged in', { userId: user.id, tenantId: user.tenant_id });

      return res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
        tenant: { id: user.tenant_id, name: user.tenant_name, slug: user.slug, plan: user.plan },
      });
    } catch (err) {
      logger.error('[auth] Login failed', { error: err.message });
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET /api/auth/me — returns current user + tenant
router.get('/me', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
              t.id AS tenant_id, t.name AS tenant_name, t.slug, t.plan
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = @userId AND u.tenant_id = @tenantId`,
      { userId: req.userId, tenantId: req.tenantId }
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = rows[0];
    return res.json({
      user: { id: u.id, email: u.email, fullName: u.full_name, role: u.role, createdAt: u.created_at },
      tenant: { id: u.tenant_id, name: u.tenant_name, slug: u.slug, plan: u.plan },
    });
  } catch (err) {
    logger.error('[auth] /me failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
