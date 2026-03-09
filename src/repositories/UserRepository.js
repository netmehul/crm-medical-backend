const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  findByEmail(email) {
    const row = this.db.get(
      `SELECT * FROM ${this.table} WHERE email = ? AND deleted_at IS NULL`,
      [email]
    );
    return row || null;
  }

  findByClinic(clinicId, { limit = 20, offset = 0 } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );
    return { rows, total };
  }

  deactivate(id, clinicId) {
    this.db.run(
      `UPDATE ${this.table}
       SET is_active = 0, updated_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    return this.findById(id, clinicId);
  }
}

module.exports = new UserRepository();
