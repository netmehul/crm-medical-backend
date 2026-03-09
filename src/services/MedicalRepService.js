const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class MedicalRepService {
  async getMedicalReps(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'clinic_id = ? AND deleted_at IS NULL';
    const params = [clinicId];

    if (query.search) {
      where += ' AND (full_name LIKE ? OR company LIKE ? OR phone LIKE ?)';
      const like = `%${query.search}%`;
      params.push(like, like, like);
    }

    const [rows] = await db.execute(
      `SELECT * FROM medical_reps
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM medical_reps WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getMedicalRep(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT * FROM medical_reps
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    const rep = rows[0];
    if (!rep) {
      throw { statusCode: 404, message: 'Medical rep not found' };
    }
    return rep;
  }

  async createMedicalRep(clinicId, data) {
    const id = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      `INSERT INTO medical_reps
         (id, clinic_id, full_name, company, phone, email, territory, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId,
        data.full_name, data.company || null,
        data.phone || null, data.email || null,
        data.territory || null, data.notes || null,
        now, now,
      ]
    );

    return await this.getMedicalRep(id, clinicId);
  }

  async updateMedicalRep(id, clinicId, data) {
    await this.getMedicalRep(id, clinicId);

    const allowed = {};
    const fields = ['full_name', 'company', 'phone', 'email', 'territory', 'notes'];
    for (const f of fields) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }

    if (Object.keys(allowed).length === 0) return await this.getMedicalRep(id, clinicId);

    allowed.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(allowed), id, clinicId];

    await db.execute(
      `UPDATE medical_reps SET ${setClause}
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      values
    );

    return await this.getMedicalRep(id, clinicId);
  }

  async deleteMedicalRep(id, clinicId) {
    const [result] = await db.execute(
      `UPDATE medical_reps SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.affectedRows === 0) {
      throw { statusCode: 404, message: 'Medical rep not found' };
    }
    return true;
  }

  async logVisit(mrId, clinicId, userId, visitData) {
    await this.getMedicalRep(mrId, clinicId);

    const id = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      `INSERT INTO mr_visits
         (id, mr_id, clinic_id, visit_date, purpose, products_discussed,
          samples_left, notes, logged_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, mrId, clinicId,
        visitData.visit_date || now,
        visitData.purpose || null,
        visitData.products_discussed || null,
        visitData.samples_left || null,
        visitData.notes || null,
        userId, now,
      ]
    );

    const [rows] = await db.execute(
      `SELECT * FROM mr_visits WHERE id = ?`, [id]
    );
    return rows[0];
  }

  async getVisits(mrId, clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const [rows] = await db.execute(
      `SELECT v.*, u.full_name AS logged_by_name
       FROM mr_visits v
       LEFT JOIN users u ON u.id = v.logged_by AND u.deleted_at IS NULL
       WHERE v.mr_id = ? AND v.clinic_id = ?
       ORDER BY v.visit_date DESC
       LIMIT ? OFFSET ?`,
      [mrId, clinicId, String(limit), String(offset)]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM mr_visits
       WHERE mr_id = ? AND clinic_id = ?`,
      [mrId, clinicId]
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }
}

module.exports = new MedicalRepService();
