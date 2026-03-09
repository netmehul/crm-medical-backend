const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PrescriptionService {
  async getPrescriptions(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const rows = db.all(
      `SELECT pr.*, p.full_name AS patient_name, u.full_name AS doctor_name
       FROM prescriptions pr
       LEFT JOIN patients p ON p.id = pr.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pr.doctor_id AND u.deleted_at IS NULL
       WHERE pr.clinic_id = ? AND pr.deleted_at IS NULL
       ORDER BY pr.created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM prescriptions
       WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async getPrescription(id, clinicId) {
    const prescription = db.get(
      `SELECT pr.*, p.full_name AS patient_name, u.full_name AS doctor_name
       FROM prescriptions pr
       LEFT JOIN patients p ON p.id = pr.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pr.doctor_id AND u.deleted_at IS NULL
       WHERE pr.id = ? AND pr.clinic_id = ? AND pr.deleted_at IS NULL`,
      [id, clinicId]
    );

    if (!prescription) {
      throw { statusCode: 404, message: 'Prescription not found' };
    }

    const medications = db.all(
      `SELECT * FROM prescription_medications WHERE prescription_id = ? ORDER BY sort_order`,
      [id]
    );

    prescription.medications = medications;
    return prescription;
  }

  async createPrescription(clinicId, data) {
    const id = generateId();
    const now = new Date().toISOString();

    let fileId = data.file_id;
    if (!fileId && data.patient_id) {
      const pf = db.get(
        `SELECT id FROM patient_files WHERE clinic_id = ? AND patient_id = ? AND deleted_at IS NULL`,
        [clinicId, data.patient_id]
      );
      if (!pf) {
        throw { statusCode: 400, message: 'No patient file found. Ensure the patient is registered at this clinic.' };
      }
      fileId = pf.id;
    }
    if (!fileId) {
      throw { statusCode: 400, message: 'file_id or patient_id is required' };
    }

    const doctorId = data.doctor_id;
    if (!doctorId) {
      throw { statusCode: 400, message: 'doctor_id is required' };
    }

    db.run(
      `INSERT INTO prescriptions
         (id, clinic_id, patient_id, file_id, appointment_id, doctor_id, visit_date, diagnosis, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId,
        data.patient_id,
        fileId,
        data.appointment_id || null,
        doctorId,
        data.visit_date || data.prescription_date || now.split('T')[0],
        data.diagnosis || null, data.notes || null,
        (data.status || 'finalized').toLowerCase(),
        now, now,
      ]
    );

    if (data.medications && data.medications.length > 0) {
      this._insertMedications(id, data.medications);
    }

    return this.getPrescription(id, clinicId);
  }

  async updatePrescription(id, clinicId, data) {
    await this.getPrescription(id, clinicId);

    const allowed = {};
    const fields = ['patient_id', 'doctor_id', 'file_id', 'appointment_id', 'diagnosis', 'notes', 'visit_date', 'status'];
    for (const f of fields) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (data.prescription_date !== undefined) allowed.visit_date = data.prescription_date;

    if (Object.keys(allowed).length > 0) {
      allowed.updated_at = new Date().toISOString();
      const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(allowed), id, clinicId];

      db.run(
        `UPDATE prescriptions SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
        values
      );
    }

    if (data.medications) {
      db.run(`DELETE FROM prescription_medications WHERE prescription_id = ?`, [id]);
      if (data.medications.length > 0) {
        this._insertMedications(id, data.medications);
      }
    }

    return this.getPrescription(id, clinicId);
  }

  async deletePrescription(id, clinicId) {
    const result = db.run(
      `UPDATE prescriptions SET deleted_at = datetime('now') WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.changes === 0) {
      throw { statusCode: 404, message: 'Prescription not found' };
    }
    return true;
  }

  _insertMedications(prescriptionId, medications) {
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      db.run(
        `INSERT INTO prescription_medications
           (id, prescription_id, drug_name, dosage, frequency, duration, instructions, quantity, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(), prescriptionId,
          med.drug_name || med.medicine_name || med.drugName || '',
          med.dosage || null,
          med.frequency || null,
          med.duration || null,
          med.instructions || med.notes || null,
          med.quantity || null,
          med.sort_order ?? i,
        ]
      );
    }
  }
}

module.exports = new PrescriptionService();
