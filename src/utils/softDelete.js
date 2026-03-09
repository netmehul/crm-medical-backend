const SOFT_DELETE_FILTER = 'AND deleted_at IS NULL';

const softDeleteClause = (alias = '') => {
  const prefix = alias ? `${alias}.` : '';
  return `AND ${prefix}deleted_at IS NULL`;
};

module.exports = { SOFT_DELETE_FILTER, softDeleteClause };
