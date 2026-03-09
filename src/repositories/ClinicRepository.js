const BaseRepository = require('./BaseRepository');

class ClinicRepository extends BaseRepository {
  constructor() {
    super('clinics');
  }

  findByOwnerEmail(email) {
    const row = this.db.get(
      `SELECT * FROM ${this.table} WHERE owner_email = ? AND deleted_at IS NULL`,
      [email]
    );
    return row || null;
  }

  updatePlan(clinicId, plan, status) {
    this.db.run(
      `UPDATE ${this.table}
       SET plan = ?, plan_status = ?, updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [plan, status, clinicId]
    );
    return this.findById(clinicId);
  }
}

module.exports = new ClinicRepository();
