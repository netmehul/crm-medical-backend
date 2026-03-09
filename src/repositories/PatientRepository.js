const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor() {
    super('patients');
  }

  async search(clinicId, searchTerm, { limit = 20, offset = 0 } = {}) {
    const like = `%${searchTerm}%`;
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, like, like, like, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND (full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)`,
      [clinicId, like, like, like]
    );

    return { rows, total: countRows[0].total };
  }

  async getLastPatientCode(clinicId) {
    const [rows] = await this.db.execute(
      `SELECT patient_code FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return rows[0] ? rows[0].patient_code : null;
  }

  async findWithFile(patientId, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT p.*,
              pf.id AS file_id,
              pf.file_number,
              pf.status AS file_status,
              pf.last_visit_at,
              pf.next_followup_at,
              u.full_name AS assigned_doctor_name
       FROM ${this.table} p
       LEFT JOIN patient_files pf ON pf.patient_id = p.id AND pf.clinic_id = p.clinic_id AND pf.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pf.assigned_doctor AND u.deleted_at IS NULL
       WHERE p.id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return rows[0] || null;
  }
}

module.exports = new PatientRepository();
