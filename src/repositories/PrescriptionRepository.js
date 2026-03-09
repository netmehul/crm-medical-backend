const BaseRepository = require('./BaseRepository');

class PrescriptionRepository extends BaseRepository {
  constructor() {
    super('prescriptions');
  }

  findWithMedications(id, clinicId) {
    const prescription = this.db.get(
      `SELECT * FROM ${this.table}
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!prescription) return null;

    const medications = this.db.all(
      `SELECT * FROM prescription_medications
       WHERE prescription_id = ? AND deleted_at IS NULL`,
      [id]
    );

    return { ...prescription, medications };
  }

  findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const rows = this.db.all(
      `SELECT p.*, u.full_name AS doctor_name
       FROM ${this.table} p
       LEFT JOIN users u ON u.id = p.doctor_id AND u.deleted_at IS NULL
       WHERE p.patient_id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return { rows, total };
  }
}

module.exports = new PrescriptionRepository();
