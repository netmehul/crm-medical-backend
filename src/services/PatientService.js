const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PatientService {
  _generateCode(lastCode, prefix) {
    let nextNum = 1;
    if (lastCode) {
      const match = lastCode.match(/-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  async _getLastPatientCode(clinicId) {
    const [rows] = await db.execute(
      `SELECT patient_code FROM patients WHERE clinic_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [clinicId]
    );
    return rows[0]?.patient_code || null;
  }

  async _getLastFileNumber(clinicId) {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
      `SELECT file_number FROM patient_files
       WHERE clinic_id = ? AND deleted_at IS NULL AND file_number LIKE ?
       ORDER BY created_at DESC LIMIT 1`,
      [clinicId, `FILE-${year}-%`]
    );
    return rows[0]?.file_number || null;
  }

  async createPatient(clinicId, userId, data) {
    const patientCode = this._generateCode(await this._getLastPatientCode(clinicId), 'PAT');
    const year = new Date().getFullYear();
    const fileNumber = this._generateCode(await this._getLastFileNumber(clinicId), `FILE-${year}`);

    const patientId = generateId();
    const fileId = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO patients
           (id, clinic_id, patient_code, full_name, date_of_birth, age, gender, blood_group,
            phone, email, address, allergies, chronic_conditions, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId, clinicId, patientCode,
          data.full_name, data.date_of_birth || null, data.age || null,
          data.gender || null, data.blood_group || null,
          data.phone || null, data.email || null, data.address || null,
          data.allergies || null, data.chronic_conditions || null,
          userId, now, now,
        ]
      );

      await conn.execute(
        `INSERT INTO patient_files (id, clinic_id, patient_id, file_number, assigned_doctor, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [fileId, clinicId, patientId, fileNumber, data.assigned_doctor || null, now, now]
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this._getPatientWithFile(patientId, clinicId);
  }

  async _getPatientWithFile(patientId, clinicId) {
    const [rows] = await db.execute(
      `SELECT p.*,
        pf.id AS file_id, pf.file_number, pf.assigned_doctor,
        pf.status AS file_status, pf.last_visit_at, pf.next_followup_at,
        u.full_name AS assigned_doctor_name
       FROM patients p
       LEFT JOIN patient_files pf ON pf.patient_id = p.id AND pf.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pf.assigned_doctor AND u.deleted_at IS NULL
       WHERE p.id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return rows[0] || null;
  }

  async getPatients(clinicId, query) {
    const { page, limit, offset, sqlLimit, sqlOffset } = getPagination(query);

    let where = 'p.clinic_id = ? AND p.deleted_at IS NULL';
    const params = [clinicId];

    if (query.search) {
      where += ' AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.patient_code LIKE ?)';
      const like = `%${query.search}%`;
      params.push(like, like, like);
    }

    const [rows] = await db.execute(
      `SELECT p.*,
        pf.id AS file_id, pf.file_number, pf.assigned_doctor,
        pf.status AS file_status, pf.last_visit_at, pf.next_followup_at,
        u.full_name AS assigned_doctor_name
       FROM patients p
       LEFT JOIN patient_files pf ON pf.patient_id = p.id AND pf.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pf.assigned_doctor AND u.deleted_at IS NULL
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, sqlLimit, sqlOffset]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM patients p WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getPatient(idOrCode, clinicId) {
    const [rows] = await db.execute(
      `SELECT p.*,
        pf.id AS file_id, pf.file_number, pf.assigned_doctor,
        pf.status AS file_status, pf.last_visit_at, pf.next_followup_at,
        u.full_name AS assigned_doctor_name
       FROM patients p
       LEFT JOIN patient_files pf ON pf.patient_id = p.id AND pf.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pf.assigned_doctor AND u.deleted_at IS NULL
       WHERE (p.id = ? OR p.patient_code = ?) AND p.clinic_id = ? AND p.deleted_at IS NULL`,
      [idOrCode, idOrCode, clinicId]
    );
    const patient = rows[0];
    if (!patient) throw { statusCode: 404, message: 'Patient not found' };
    return patient;
  }

  async updatePatient(patientId, clinicId, data) {
    const [existingRows] = await db.execute(
      `SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    const existing = existingRows[0];
    if (!existing) throw { statusCode: 404, message: 'Patient not found' };

    const allowed = {};
    for (const f of ['full_name', 'date_of_birth', 'age', 'gender', 'blood_group', 'phone', 'email', 'address', 'allergies', 'chronic_conditions']) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (Object.keys(allowed).length === 0) return await this.getPatient(patientId, clinicId);

    allowed.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    await db.execute(
      `UPDATE patients SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(allowed), patientId, clinicId]
    );

    return await this.getPatient(patientId, clinicId);
  }

  async deletePatient(patientId, clinicId) {
    const [result] = await db.execute(
      `UPDATE patients SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    if (result.affectedRows === 0) throw { statusCode: 404, message: 'Patient not found' };
    return true;
  }
}

module.exports = new PatientService();
