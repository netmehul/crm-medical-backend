const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table} WHERE email = ? AND deleted_at IS NULL`,
      [email]
    );
    return rows[0] || null;
  }

  async findByClinic(clinicId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );

    return { rows, total: countRows[0].total };
  }

  async deactivate(id, clinicId) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET is_active = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    return this.findById(id, clinicId);
  }
}

module.exports = new UserRepository();
