const BaseRepository = require('./BaseRepository');

class PatientFileRepository extends BaseRepository {
  constructor() {
    super('patient_files');
  }

  findByPatientId(patientId, clinicId) {
    const row = this.db.get(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return row || null;
  }

  getLastFileNumber(clinicId) {
    const row = this.db.get(
      `SELECT file_number FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return row ? row.file_number : null;
  }

  updateLastVisit(fileId, clinicId) {
    this.db.run(
      `UPDATE ${this.table}
       SET last_visit_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [fileId, clinicId]
    );
    return this.findById(fileId, clinicId);
  }

  updateFollowUp(fileId, clinicId, date) {
    this.db.run(
      `UPDATE ${this.table}
       SET next_followup_at = ?, updated_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [date, fileId, clinicId]
    );
    return this.findById(fileId, clinicId);
  }
}

module.exports = new PatientFileRepository();
