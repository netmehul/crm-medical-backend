const BaseRepository = require('./BaseRepository');

class AppointmentRepository extends BaseRepository {
  constructor() {
    super('appointments');
  }

  async findByDate(clinicId, date) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND DATE(scheduled_at) = ? AND deleted_at IS NULL
       ORDER BY scheduled_at ASC`,
      [clinicId, date]
    );
    return rows;
  }

  async findByDoctor(clinicId, doctorId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND doctor_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, doctorId, String(limit), String(offset)]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND doctor_id = ? AND deleted_at IS NULL`,
      [clinicId, doctorId]
    );

    return { rows, total: countRows[0].total };
  }

  async findByPatient(patientId, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_at DESC`,
      [patientId, clinicId]
    );
    return rows;
  }

  async findUpcoming(clinicId, { limit = 10 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND status = 'scheduled' AND scheduled_at > CURRENT_TIMESTAMP
       ORDER BY scheduled_at ASC
       LIMIT ?`,
      [clinicId, String(limit)]
    );
    return rows;
  }

  async countThisMonth(clinicId) {
    const [rows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND YEAR(created_at) = YEAR(CURRENT_TIMESTAMP)
         AND MONTH(created_at) = MONTH(CURRENT_TIMESTAMP)`,
      [clinicId]
    );
    return rows[0].total;
  }
}

module.exports = new AppointmentRepository();
