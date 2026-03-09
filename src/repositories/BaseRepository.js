const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class BaseRepository {
  constructor(tableName) {
    this.table = tableName;
    this.db = db;
  }

  findById(id, clinicId = null) {
    let query = `SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`;
    const params = [id];

    if (clinicId) {
      query += ' AND clinic_id = ?';
      params.push(clinicId);
    }

    return this.db.get(query, params) || null;
  }

  findAll(clinicId, { limit = 20, offset = 0, orderBy = 'created_at', order = 'DESC' } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY ${orderBy} ${order}
       LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table} WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );
    return { rows, total };
  }

  create(data) {
    const id = generateId();
    const now = new Date().toISOString();
    const record = { id, ...data, created_at: now, updated_at: now };

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    this.db.run(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id);
  }

  update(id, clinicId, data) {
    const updated = { ...data, updated_at: new Date().toISOString() };
    const setClause = Object.keys(updated).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(updated), id, clinicId];

    this.db.run(
      `UPDATE ${this.table} SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      values
    );

    return this.findById(id, clinicId);
  }

  softDelete(id, clinicId) {
    const result = this.db.run(
      `UPDATE ${this.table} SET deleted_at = datetime('now') WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    return result.changes > 0;
  }

  exists(id, clinicId = null) {
    let query = `SELECT 1 FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`;
    const params = [id];

    if (clinicId) {
      query += ' AND clinic_id = ?';
      params.push(clinicId);
    }

    return !!this.db.get(query, params);
  }

  count(clinicId, whereExtra = '', paramsExtra = []) {
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL ${whereExtra}`,
      [clinicId, ...paramsExtra]
    );
    return total;
  }
}

module.exports = BaseRepository;
