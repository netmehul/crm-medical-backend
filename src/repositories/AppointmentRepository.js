const BaseRepository = require('./BaseRepository');

class AppointmentRepository extends BaseRepository {
  constructor() {
    super('appointments');
  }

  findByDate(clinicId, date) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND DATE(scheduled_at) = ? AND deleted_at IS NULL
       ORDER BY scheduled_at ASC`,
      [clinicId, date]
    );
    return rows;
  }

  findByDoctor(clinicId, doctorId, { limit = 20, offset = 0 } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND doctor_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, doctorId, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND doctor_id = ? AND deleted_at IS NULL`,
      [clinicId, doctorId]
    );
    return { rows, total };
  }

  findByPatient(patientId, clinicId) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_at DESC`,
      [patientId, clinicId]
    );
    return rows;
  }

  findUpcoming(clinicId, { limit = 10 } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND status = 'scheduled' AND scheduled_at > datetime('now')
       ORDER BY scheduled_at ASC
       LIMIT ?`,
      [clinicId, limit]
    );
    return rows;
  }

  countThisMonth(clinicId) {
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
         AND strftime('%Y', created_at) = strftime('%Y', 'now')
         AND strftime('%m', created_at) = strftime('%m', 'now')`,
      [clinicId]
    );
    return total;
  }
}

module.exports = new AppointmentRepository();
