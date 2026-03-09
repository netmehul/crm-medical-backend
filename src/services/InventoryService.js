const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class InventoryService {
  async getItems(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'clinic_id = ? AND deleted_at IS NULL';
    const params = [clinicId];

    if (query.search) {
      where += ' AND item_name LIKE ?';
      params.push(`%${query.search}%`);
    }
    if (query.category) {
      where += ' AND category = ?';
      params.push(query.category);
    }

    const rows = db.all(
      `SELECT * FROM inventory WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM inventory WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async getItem(id, clinicId) {
    const item = db.get(
      `SELECT * FROM inventory WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!item) throw { statusCode: 404, message: 'Inventory item not found' };
    return item;
  }

  async createItem(clinicId, data) {
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO inventory
         (id, clinic_id, item_name, category, quantity, unit, low_stock_threshold, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clinicId, data.item_name, data.category || 'other',
       data.quantity || 0, data.unit || null,
       data.low_stock_threshold || data.reorder_level || 10,
       data.notes || null, now, now]
    );

    return this.getItem(id, clinicId);
  }

  async updateItem(id, clinicId, data) {
    await this.getItem(id, clinicId);

    const allowed = {};
    for (const f of ['item_name', 'category', 'quantity', 'unit', 'low_stock_threshold', 'notes']) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (data.reorder_level !== undefined) allowed.low_stock_threshold = data.reorder_level;

    if (Object.keys(allowed).length === 0) return this.getItem(id, clinicId);

    allowed.updated_at = new Date().toISOString();
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE inventory SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(allowed), id, clinicId]
    );

    return this.getItem(id, clinicId);
  }

  async deleteItem(id, clinicId) {
    const result = db.run(
      `UPDATE inventory SET deleted_at = datetime('now') WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.changes === 0) throw { statusCode: 404, message: 'Inventory item not found' };
    return true;
  }

  async stockTransaction(id, clinicId, userId, { type, quantity, reason }) {
    const item = await this.getItem(id, clinicId);

    let newQuantity;
    if (type === 'in' || type === 'stock_in') {
      newQuantity = item.quantity + quantity;
    } else if (type === 'out' || type === 'stock_out') {
      if (item.quantity < quantity) throw { statusCode: 400, message: 'Insufficient stock' };
      newQuantity = item.quantity - quantity;
    } else {
      throw { statusCode: 400, message: 'Transaction type must be "in" or "out"' };
    }

    const now = new Date().toISOString();

    db.run(
      `UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [newQuantity, now, id, clinicId]
    );

    db.run(
      `INSERT INTO inventory_transactions (id, clinic_id, inventory_id, type, quantity, reason, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), clinicId, id, type, quantity, reason || null, userId, now]
    );

    return this.getItem(id, clinicId);
  }

  async getLowStock(clinicId) {
    return db.all(
      `SELECT * FROM inventory
       WHERE clinic_id = ? AND deleted_at IS NULL AND quantity <= low_stock_threshold
       ORDER BY quantity ASC`,
      [clinicId]
    );
  }
}

module.exports = new InventoryService();
