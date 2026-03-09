const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PatientFileService {
  async getFile(patientId, clinicId) {
    const file = db.get(
      `SELECT pf.*, u.full_name AS assigned_doctor_name
       FROM patient_files pf
       LEFT JOIN users u ON u.id = pf.assigned_doctor AND u.deleted_at IS NULL
       WHERE pf.patient_id = ? AND pf.clinic_id = ? AND pf.deleted_at IS NULL`,
      [patientId, clinicId]
    );
    if (!file) throw { statusCode: 404, message: 'Patient file not found' };
    return file;
  }

  async updateFile(patientId, clinicId, data) {
    const file = await this.getFile(patientId, clinicId);

    const allowed = {};
    for (const f of ['assigned_doctor', 'status', 'next_followup_at', 'last_visit_at']) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (data.assigned_doctor_id !== undefined) allowed.assigned_doctor = data.assigned_doctor_id;
    if (data.file_status !== undefined) allowed.status = data.file_status;

    if (Object.keys(allowed).length === 0) return file;

    allowed.updated_at = new Date().toISOString();
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE patient_files SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(allowed), file.id, clinicId]
    );

    return this.getFile(patientId, clinicId);
  }

  // ── Reports ───────────────────────────────────────────────

  async getReports(patientId, clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const rows = db.all(
      `SELECT r.*, u.full_name AS uploaded_by_name
       FROM patient_reports r
       LEFT JOIN users u ON u.id = r.uploaded_by AND u.deleted_at IS NULL
       WHERE r.patient_id = ? AND r.clinic_id = ? AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM patient_reports
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async addReport(patientId, clinicId, userId, reportData) {
    const file = await this.getFile(patientId, clinicId);
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO patient_reports
         (id, clinic_id, patient_id, file_id, report_name, report_type,
          file_path, file_name, file_type, file_size_kb, report_date, notes, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId, patientId, file.id,
        reportData.report_name || reportData.title || 'Report',
        reportData.report_type || 'other',
        reportData.file_path || null, reportData.file_name || null,
        reportData.file_type || null, reportData.file_size_kb || null,
        reportData.report_date || now, reportData.notes || null,
        userId, now,
      ]
    );

    return db.get(`SELECT * FROM patient_reports WHERE id = ?`, [id]);
  }

  async deleteReport(reportId, clinicId) {
    const result = db.run(
      `UPDATE patient_reports SET deleted_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [reportId, clinicId]
    );
    if (result.changes === 0) throw { statusCode: 404, message: 'Report not found' };
    return true;
  }

  // ── Notes ─────────────────────────────────────────────────

  async getNotes(patientId, clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const rows = db.all(
      `SELECT pn.*, u.full_name AS created_by_name
       FROM patient_notes pn
       LEFT JOIN users u ON u.id = pn.created_by AND u.deleted_at IS NULL
       WHERE pn.patient_id = ? AND pn.clinic_id = ? AND pn.deleted_at IS NULL
       ORDER BY pn.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM patient_notes
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async addNote(patientId, clinicId, userId, noteData) {
    const file = await this.getFile(patientId, clinicId);
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO patient_notes
         (id, clinic_id, patient_id, file_id, note_type, title, content,
          visit_date, is_private, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId, patientId, file.id,
        noteData.note_type || 'visit_note',
        noteData.title || null, noteData.content,
        noteData.visit_date || null, noteData.is_private ? 1 : 0,
        userId, now, now,
      ]
    );

    return db.get(`SELECT * FROM patient_notes WHERE id = ? AND deleted_at IS NULL`, [id]);
  }

  async updateNote(noteId, clinicId, data) {
    const existing = db.get(
      `SELECT * FROM patient_notes WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [noteId, clinicId]
    );
    if (!existing) throw { statusCode: 404, message: 'Note not found' };

    const allowed = {};
    for (const f of ['title', 'content', 'note_type', 'visit_date', 'is_private']) {
      if (data[f] !== undefined) allowed[f] = f === 'is_private' ? (data[f] ? 1 : 0) : data[f];
    }
    if (Object.keys(allowed).length === 0) return existing;

    allowed.updated_at = new Date().toISOString();
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE patient_notes SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(allowed), noteId, clinicId]
    );

    return db.get(`SELECT * FROM patient_notes WHERE id = ? AND deleted_at IS NULL`, [noteId]);
  }

  async deleteNote(noteId, clinicId) {
    const result = db.run(
      `UPDATE patient_notes SET deleted_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [noteId, clinicId]
    );
    if (result.changes === 0) throw { statusCode: 404, message: 'Note not found' };
    return true;
  }
}

module.exports = new PatientFileService();
