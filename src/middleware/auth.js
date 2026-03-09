const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { unauthorized } = require('../utils/apiResponse');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return unauthorized(res, 'No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tier !== 'app') return unauthorized(res, 'Invalid token type');

    const [rows] = await db.execute(
      `SELECT u.*, o.plan, o.plan_status
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.deleted_at IS NULL AND u.is_active = 1`,
      [decoded.userId]
    );
    const user = rows[0];

    if (!user) return unauthorized(res, 'User not found or inactive');
    if (user.plan_status === 'suspended') {
      return unauthorized(res, 'Your organization has been suspended. Contact support.');
    }

    req.user = user;
    req.userId = user.id;
    req.orgId = user.organization_id;
    req.clinicId = decoded.clinicId;
    req.role = decoded.role;
    req.plan = user.plan;
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = auth;
