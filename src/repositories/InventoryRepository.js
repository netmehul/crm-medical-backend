const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory');
  }

  async findLowStock(clinicId) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND quantity <= low_stock_threshold
       ORDER BY quantity ASC`,
      [clinicId]
    );
    return rows;
  }

  async adjustStock(id, clinicId, quantity) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [quantity, id, clinicId]
    );
    return this.findById(id, clinicId);
  }

  async search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND item_name LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, String(limit), String(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND item_name LIKE ?`,
      [clinicId, like]
    );

    return { rows, total: countRows[0].total };
  }
}

module.exports = new InventoryRepository();
