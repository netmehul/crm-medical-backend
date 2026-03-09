const BaseRepository = require('./BaseRepository');

class PatientFileRepository extends BaseRepository {
  constructor() {
    super('patient_files');
  }

  async findByPatientId(patientId, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return rows[0] || null;
  }

  async getLastFileNumber(clinicId) {
    const [rows] = await this.db.execute(
      `SELECT file_number FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return rows[0] ? rows[0].file_number : null;
  }

  async updateLastVisit(fileId, clinicId) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET last_visit_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [fileId, clinicId]
    );
    return this.findById(fileId, clinicId);
  }

  async updateFollowUp(fileId, clinicId, date) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET next_followup_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [date, fileId, clinicId]
    );
    return this.findById(fileId, clinicId);
  }
}

module.exports = new PatientFileRepository();
