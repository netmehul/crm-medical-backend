const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  const offset = (page - 1) * limit;

  // String versions for SQL parameters
  const sqlLimit = String(limit);
  const sqlOffset = String(offset);

  return { page, limit, offset, sqlLimit, sqlOffset };
};

const paginatedResponse = (data, total, page, limit) => ({
  items: data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

module.exports = { getPagination, paginatedResponse };
