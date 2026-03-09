const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class AppointmentService {
  async getAppointments(clinicId, query) {
    const { page, limit, offset, sqlLimit, sqlOffset } = getPagination(query);

    let where = 'a.clinic_id = ? AND a.deleted_at IS NULL';
    const params = [clinicId];

    if (query.date) {
      where += ' AND DATE(a.scheduled_at) = ?';
      params.push(query.date);
    }
    if (query.status) {
      where += ' AND a.status = ?';
      params.push(query.status);
    }
    if (query.doctor_id) {
      where += ' AND a.doctor_id = ?';
      params.push(query.doctor_id);
    }
    if (query.patient_id) {
      where += ' AND a.patient_id = ?';
      params.push(query.patient_id);
    }

    const [rows] = await db.execute(
      `SELECT a.*, p.full_name AS patient_name, p.age AS patient_age, u.full_name AS doctor_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = a.doctor_id AND u.deleted_at IS NULL
       WHERE ${where}
       ORDER BY a.scheduled_at DESC
       LIMIT ? OFFSET ?`,
      [...params, sqlLimit, sqlOffset]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM appointments a WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getAppointment(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT a.*, p.full_name AS patient_name, p.age AS patient_age, u.full_name AS doctor_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = a.doctor_id AND u.deleted_at IS NULL
       WHERE a.id = ? AND a.clinic_id = ? AND a.deleted_at IS NULL`,
      [id, clinicId]
    );
    const row = rows[0];

    if (!row) {
      throw { statusCode: 404, message: 'Appointment not found' };
    }
    return row;
  }

  async createAppointment(clinicId, userId, data) {
    const id = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const doctorId = data.doctor_id || userId;
    if (!doctorId) {
      throw { statusCode: 400, message: 'Doctor is required. Please ensure you are logged in.' };
    }

    const scheduledAt = data.scheduled_at
      || (data.appointment_date && data.start_time
        ? `${data.appointment_date} ${data.start_time}:00`
        : data.appointment_date || now);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO appointments
           (id, clinic_id, patient_id, doctor_id, file_id, scheduled_at, duration_mins, status, type, reason, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, clinicId,
          data.patient_id, doctorId,
          data.file_id || null,
          scheduledAt,
          data.duration_mins || 30,
          data.status || 'scheduled', data.type || 'general',
          data.reason || null, data.notes || null,
          userId, now, now,
        ]
      );

      if (data.patient_id) {
        await conn.execute(
          `UPDATE patient_files SET last_visit_at = ?, updated_at = ?
           WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
          [now, now, data.patient_id, clinicId]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getAppointment(id, clinicId);
  }

  async updateAppointment(id, clinicId, data) {
    const existing = await this.getAppointment(id, clinicId);

    const allowed = {};
    const fields = [
      'patient_id', 'doctor_id', 'file_id', 'scheduled_at',
      'duration_mins', 'status', 'type', 'reason', 'notes',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }

    if (Object.keys(allowed).length === 0) return existing;

    allowed.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(allowed), id, clinicId];

    await db.execute(
      `UPDATE appointments SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      values
    );

    return await this.getAppointment(id, clinicId);
  }

  async deleteAppointment(id, clinicId) {
    const [result] = await db.execute(
      `UPDATE appointments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.affectedRows === 0) {
      throw { statusCode: 404, message: 'Appointment not found' };
    }
    return true;
  }
}

module.exports = new AppointmentService();
