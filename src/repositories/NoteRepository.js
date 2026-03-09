const BaseRepository = require('./BaseRepository');

class NoteRepository extends BaseRepository {
  constructor() {
    super('patient_notes');
  }

  async findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT pn.*, u.full_name AS created_by_name
       FROM ${this.table} pn
       LEFT JOIN users u ON u.id = pn.created_by AND u.deleted_at IS NULL
       WHERE pn.patient_id = ? AND pn.clinic_id = ? AND pn.deleted_at IS NULL
       ORDER BY pn.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, String(limit), String(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return { rows, total: countRows[0].total };
  }
}

module.exports = new NoteRepository();
