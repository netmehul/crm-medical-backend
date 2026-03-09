const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor() {
    super('patients');
  }

  search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, like, like, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)`,
      [clinicId, like, like, like]
    );
    return { rows, total };
  }

  getLastPatientCode(clinicId) {
    const row = this.db.get(
      `SELECT patient_code FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return row ? row.patient_code : null;
  }

  findWithFile(patientId, clinicId) {
    const row = this.db.get(
      `SELECT p.*,
              pf.id AS file_id,
              pf.file_number,
              pf.file_status,
              pf.last_visit_at,
              pf.next_followup_at,
              u.full_name AS assigned_doctor_name
       FROM ${this.table} p
       LEFT JOIN patient_files pf ON pf.patient_id = p.id AND pf.clinic_id = p.clinic_id AND pf.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pf.assigned_doctor_id AND u.deleted_at IS NULL
       WHERE p.id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return row || null;
  }
}

module.exports = new PatientRepository();
