const { forbidden } = require('../utils/apiResponse');

const roleGuard = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.role)) {
    return forbidden(res, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = roleGuard;
