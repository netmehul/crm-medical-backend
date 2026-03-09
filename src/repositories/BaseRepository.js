const db = require('../config/database');
const { generateId } = require('../utils/uuid');

class BaseRepository {
  constructor(tableName) {
    this.table = tableName;
    this.db = db;
  }

  async findById(id, clinicId = null) {
    let query = `SELECT * FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`;
    const params = [id];

    if (clinicId) {
      query += ' AND clinic_id = ?';
      params.push(clinicId);
    }

    const [rows] = await this.db.execute(query, params);
    return rows[0] || null;
  }

  async findAll(clinicId, { limit = 20, offset = 0, orderBy = 'created_at', order = 'DESC' } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY ${orderBy} ${order}
       LIMIT ? OFFSET ?`,
      [clinicId, String(limit), String(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table} WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );

    return { rows, total: countRows[0].total };
  }

  async create(data) {
    const id = generateId();
    const record = { id, ...data }; // timestamps handled by MySQL DEFAULT CURRENT_TIMESTAMP

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    await this.db.execute(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id);
  }

  async update(id, clinicId, data) {
    const updated = { ...data }; // updated_at could be handled here or via MySQL trigger/manual update
    // For now, let's keep manual update for updated_at if not handled by MySQL
    updated.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const setClause = Object.keys(updated).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(updated), id, clinicId];

    await this.db.execute(
      `UPDATE ${this.table} SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      values
    );

    return this.findById(id, clinicId);
  }

  async softDelete(id, clinicId) {
    const [result] = await this.db.execute(
      `UPDATE ${this.table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    return result.affectedRows > 0;
  }

  async exists(id, clinicId = null) {
    let query = `SELECT 1 FROM ${this.table} WHERE id = ? AND deleted_at IS NULL`;
    const params = [id];

    if (clinicId) {
      query += ' AND clinic_id = ?';
      params.push(clinicId);
    }

    const [rows] = await this.db.execute(query, params);
    return rows.length > 0;
  }

  async count(clinicId, whereExtra = '', paramsExtra = []) {
    const [rows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL ${whereExtra}`,
      [clinicId, ...paramsExtra]
    );
    return rows[0].total;
  }
}

module.exports = BaseRepository;
