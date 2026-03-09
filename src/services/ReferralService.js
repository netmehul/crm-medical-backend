const db              = require('../config/database');
const { generateId }  = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const LetterService   = require('./LetterService');
const EmailService    = require('./EmailService');
const WhatsAppService = require('./WhatsAppService');

class ReferralService {

  _generateReferenceNumber(clinicId) {
    const year = new Date().getFullYear();
    const last = db.get(
      `SELECT reference_number FROM lab_referrals WHERE clinic_id = ? ORDER BY created_at DESC LIMIT 1`,
      [clinicId]
    );
    if (!last) return `REF-${year}-0001`;
    const parts = last.reference_number.split('-');
    const num   = parseInt(parts[2]) + 1;
    return `REF-${year}-${String(num).padStart(4, '0')}`;
  }

  async createReferral(clinicId, userId, data) {
    const { patientId, fileId, labId, urgency, clinicalNotes, specialInstructions, tests } = data;

    if (!patientId || !labId) throw { statusCode: 400, message: 'Patient and Lab are required' };

    let resolvedFileId = fileId;
    if (!resolvedFileId) {
      const file = db.get(
        `SELECT id FROM patient_files WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
        [patientId, clinicId]
      );
      if (file) resolvedFileId = file.id;
      else throw { statusCode: 400, message: 'Patient file not found' };
    }

    const referenceNumber = this._generateReferenceNumber(clinicId);
    const referralId = generateId();

    const insertReferral = db.transaction(() => {
      db.run(
        `INSERT INTO lab_referrals (id, clinic_id, patient_id, file_id, lab_id, referred_by, reference_number, urgency, clinical_notes, special_instructions, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [referralId, clinicId, patientId, resolvedFileId, labId, userId,
         referenceNumber, urgency || 'routine', clinicalNotes || null, specialInstructions || null]
      );

      if (tests && tests.length > 0) {
        const stmt = db.raw.prepare(
          `INSERT INTO referral_tests (id, referral_id, test_name, test_code, instructions, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        tests.forEach((t, i) => {
          stmt.run(generateId(), referralId, t.testName, t.testCode || null, t.instructions || null, i);
        });
      }
    });

    insertReferral();

    try {
      await LetterService.generateReferralLetter(referralId);
    } catch (e) {
      console.error('Letter generation failed (non-blocking):', e.message);
    }

    return this.getReferral(referralId, clinicId);
  }

  async getReferrals(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'r.clinic_id = ? AND r.deleted_at IS NULL';
    const params = [clinicId];

    if (query.patientId) {
      where += ' AND r.patient_id = ?';
      params.push(query.patientId);
    }
    if (query.status) {
      where += ' AND r.status = ?';
      params.push(query.status);
    }
    if (query.labId) {
      where += ' AND r.lab_id = ?';
      params.push(query.labId);
    }

    const rows = db.all(
      `SELECT r.*,
              p.full_name AS patient_name, p.patient_code,
              l.name AS lab_name, l.type AS lab_type, l.email AS lab_email, l.phone AS lab_phone, l.whatsapp_number AS lab_whatsapp,
              u.full_name AS doctor_name
       FROM lab_referrals r
       JOIN patients p ON p.id = r.patient_id
       JOIN external_labs l ON l.id = r.lab_id
       JOIN users u ON u.id = r.referred_by
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM lab_referrals r WHERE ${where}`, params
    );

    const enriched = rows.map(row => {
      const tests = db.all(
        `SELECT * FROM referral_tests WHERE referral_id = ? ORDER BY sort_order ASC`, [row.id]
      );
      const communications = db.all(
        `SELECT * FROM referral_communications WHERE referral_id = ? ORDER BY sent_at DESC`, [row.id]
      );
      return { ...row, tests, communications };
    });

    return paginatedResponse(enriched, total, page, limit);
  }

  getReferral(id, clinicId) {
    const referral = db.get(
      `SELECT r.*,
              p.full_name AS patient_name, p.patient_code, p.phone AS patient_phone, p.age AS patient_age, p.gender AS patient_gender,
              l.name AS lab_name, l.type AS lab_type, l.email AS lab_email, l.phone AS lab_phone,
              l.whatsapp_number AS lab_whatsapp, l.contact_person AS lab_contact,
              u.full_name AS doctor_name
       FROM lab_referrals r
       JOIN patients p ON p.id = r.patient_id
       JOIN external_labs l ON l.id = r.lab_id
       JOIN users u ON u.id = r.referred_by
       WHERE r.id = ? AND r.clinic_id = ? AND r.deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    referral.tests = db.all(
      `SELECT * FROM referral_tests WHERE referral_id = ? ORDER BY sort_order ASC`, [id]
    );
    referral.communications = db.all(
      `SELECT * FROM referral_communications WHERE referral_id = ? ORDER BY sent_at DESC`, [id]
    );

    return referral;
  }

  async sendReferral(referralId, clinicId, userId, channels, overrides = {}) {
    const referral = db.get(
      `SELECT * FROM lab_referrals WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [referralId, clinicId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    if (!referral.letter_path) {
      await LetterService.generateReferralLetter(referralId);
    }

    const results = {};

    if (channels.includes('email')) {
      results.email = await EmailService.sendReferralLetter(referralId, userId, overrides.emailOverride);
    }

    if (channels.includes('whatsapp')) {
      results.whatsapp = await WhatsAppService.prepareWhatsApp(referralId, userId, overrides.phoneOverride);
    }

    if (channels.includes('print')) {
      db.run(
        `INSERT INTO referral_communications (id, referral_id, channel, sent_by, status, sent_at)
         VALUES (?, ?, 'print', ?, 'sent', datetime('now'))`,
        [generateId(), referralId, userId]
      );
    }

    return results;
  }

  updateStatus(id, clinicId, status) {
    const referral = db.get(
      `SELECT id FROM lab_referrals WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    db.run(
      `UPDATE lab_referrals SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, id]
    );

    return this.getReferral(id, clinicId);
  }

  softDelete(id, clinicId) {
    const referral = db.get(
      `SELECT id FROM lab_referrals WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    db.run(
      `UPDATE lab_referrals SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    return { id };
  }

  getCommunications(referralId, clinicId) {
    const referral = db.get(
      `SELECT id FROM lab_referrals WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [referralId, clinicId]
    );
    if (!referral) throw { statusCode: 404, message: 'Referral not found' };

    return db.all(
      `SELECT rc.*, u.full_name AS sent_by_name
       FROM referral_communications rc
       LEFT JOIN users u ON u.id = rc.sent_by
       WHERE rc.referral_id = ?
       ORDER BY rc.sent_at DESC`,
      [referralId]
    );
  }
}

module.exports = new ReferralService();
