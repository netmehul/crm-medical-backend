const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return error(res, 'A record with this value already exists', 409);
  }

  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401);
  }

  if (err.type === 'validation') {
    return error(res, 'Validation failed', 400, err.errors);
  }

  return error(res, err.message || 'Internal server error', err.statusCode || 500);
};

module.exports = errorHandler;
