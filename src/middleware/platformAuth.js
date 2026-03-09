const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { unauthorized } = require('../utils/apiResponse');

const platformAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return unauthorized(res, 'No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tier !== 'platform') return unauthorized(res, 'Platform admin access required');

    const admin = db.get(
      `SELECT * FROM platform_admins
       WHERE id = ? AND deleted_at IS NULL AND is_active = 1`,
      [decoded.adminId]
    );

    if (!admin) return unauthorized(res, 'Admin not found or inactive');

    req.admin   = admin;
    req.adminId = admin.id;
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = platformAuth;
