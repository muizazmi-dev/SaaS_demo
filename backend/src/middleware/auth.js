const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Verifies the Bearer JWT and attaches { userId, tenantId, role } to req.
 * Every protected route calls this first — no tenantId means no data access.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.tenantId = payload.tenantId;
    req.role = payload.role;
    next();
  } catch (err) {
    logger.warn('[auth] Invalid token', { error: err.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard — use after authenticate().
 * Usage: router.delete('/users/:id', authenticate, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
