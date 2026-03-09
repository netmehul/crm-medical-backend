const BaseRepository = require('./BaseRepository');

class PrescriptionRepository extends BaseRepository {
  constructor() {
    super('prescriptions');
  }

  async findWithMedications(id, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    const prescription = rows[0];
    if (!prescription) return null;

    const [medications] = await this.db.execute(
      `SELECT * FROM prescription_medications
       WHERE prescription_id = ? AND deleted_at IS NULL`,
      [id]
    );

    return { ...prescription, medications };
  }

  async findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT p.*, u.full_name AS doctor_name
       FROM ${this.table} p
       LEFT JOIN users u ON u.id = p.doctor_id AND u.deleted_at IS NULL
       WHERE p.patient_id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, sqlLimit, sqlOffset]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return { rows, total: countRows[0].total };
  }
}

module.exports = new PrescriptionRepository();
