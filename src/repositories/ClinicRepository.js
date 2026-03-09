const BaseRepository = require('./BaseRepository');

class ClinicRepository extends BaseRepository {
  constructor() {
    super('clinics');
  }

  async findByOwnerEmail(email) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table} WHERE owner_email = ? AND deleted_at IS NULL`,
      [email]
    );
    return rows[0] || null;
  }

  async updatePlan(clinicId, plan, status) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET plan = ?, plan_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [plan, status, clinicId]
    );
    return this.findById(clinicId);
  }
}

module.exports = new ClinicRepository();
