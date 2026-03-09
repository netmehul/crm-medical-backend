const BaseRepository = require('./BaseRepository');
const { generateId } = require('../utils/uuid');

class ReportRepository extends BaseRepository {
  constructor() {
    super('patient_reports');
  }

  async create(data) {
    const id = generateId();
    const record = { id, ...data }; // timestamps handled by MySQL DEFAULT CURRENT_TIMESTAMP

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    await this.db.execute(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id);
  }

  async findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
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

module.exports = new ReportRepository();
