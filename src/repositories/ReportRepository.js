const BaseRepository = require('./BaseRepository');
const { generateId } = require('../utils/uuid');

class ReportRepository extends BaseRepository {
  constructor() {
    super('patient_reports');
  }

  create(data) {
    const id = generateId();
    const now = new Date().toISOString();
    const record = { id, ...data, created_at: now };

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    this.db.run(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id);
  }

  findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
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

module.exports = new ReportRepository();
