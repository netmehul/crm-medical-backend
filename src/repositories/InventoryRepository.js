const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory');
  }

  findLowStock(clinicId) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND quantity <= low_stock_threshold
       ORDER BY quantity ASC`,
      [clinicId]
    );
    return rows;
  }

  adjustStock(id, clinicId, quantity) {
    this.db.run(
      `UPDATE ${this.table}
       SET quantity = quantity + ?, updated_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [quantity, id, clinicId]
    );
    return this.findById(id, clinicId);
  }

  search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND item_name LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND item_name LIKE ?`,
      [clinicId, like]
    );
    return { rows, total };
  }
}

module.exports = new InventoryRepository();
