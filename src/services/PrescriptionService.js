const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class PrescriptionService {
  async getPrescriptions(clinicId, query) {
    const { page, limit, offset, sqlLimit, sqlOffset } = getPagination(query);

    const [rows] = await db.execute(
      `SELECT pr.*, p.full_name AS patient_name, u.full_name AS doctor_name
       FROM prescriptions pr
       LEFT JOIN patients p ON p.id = pr.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pr.doctor_id AND u.deleted_at IS NULL
       WHERE pr.clinic_id = ? AND pr.deleted_at IS NULL
       ORDER BY pr.created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, sqlLimit, sqlOffset]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM prescriptions
       WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getPrescription(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT pr.*, p.full_name AS patient_name, u.full_name AS doctor_name
       FROM prescriptions pr
       LEFT JOIN patients p ON p.id = pr.patient_id AND p.deleted_at IS NULL
       LEFT JOIN users u ON u.id = pr.doctor_id AND u.deleted_at IS NULL
       WHERE pr.id = ? AND pr.clinic_id = ? AND pr.deleted_at IS NULL`,
      [id, clinicId]
    );
    const prescription = rows[0];

    if (!prescription) {
      throw { statusCode: 404, message: 'Prescription not found' };
    }

    const [medications] = await db.execute(
      `SELECT * FROM prescription_medications WHERE prescription_id = ? ORDER BY sort_order`,
      [id]
    );

    prescription.medications = medications;
    return prescription;
  }

  async createPrescription(clinicId, data) {
    const id = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    let fileId = data.file_id;
    if (!fileId && data.patient_id) {
      const [files] = await db.execute(
        `SELECT id FROM patient_files WHERE clinic_id = ? AND patient_id = ? AND deleted_at IS NULL`,
        [clinicId, data.patient_id]
      );
      if (!files.length) {
        throw { statusCode: 400, message: 'No patient file found. Ensure the patient is registered at this clinic.' };
      }
      fileId = files[0].id;
    }
    if (!fileId) {
      throw { statusCode: 400, message: 'file_id or patient_id is required' };
    }

    const doctorId = data.doctor_id;
    if (!doctorId) {
      throw { statusCode: 400, message: 'doctor_id is required' };
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO prescriptions
           (id, clinic_id, patient_id, file_id, appointment_id, doctor_id, visit_date, diagnosis, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, clinicId,
          data.patient_id,
          fileId,
          data.appointment_id || null,
          doctorId,
          data.visit_date || data.prescription_date || now.split(' ')[0],
          data.diagnosis || null, data.notes || null,
          (data.status || 'finalized').toLowerCase(),
          now, now,
        ]
      );

      if (data.medications && data.medications.length > 0) {
        await this._insertMedicationsWithConn(conn, id, data.medications);
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getPrescription(id, clinicId);
  }

  async updatePrescription(id, clinicId, data) {
    await this.getPrescription(id, clinicId);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const allowed = {};
      const fields = ['patient_id', 'doctor_id', 'file_id', 'appointment_id', 'diagnosis', 'notes', 'visit_date', 'status'];
      for (const f of fields) {
        if (data[f] !== undefined) allowed[f] = data[f];
      }
      if (data.prescription_date !== undefined) allowed.visit_date = data.prescription_date;

      if (Object.keys(allowed).length > 0) {
        allowed.updated_at = now;
        const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(allowed), id, clinicId];

        await conn.execute(
          `UPDATE prescriptions SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
          values
        );
      }

      if (data.medications) {
        await conn.execute(`DELETE FROM prescription_medications WHERE prescription_id = ?`, [id]);
        if (data.medications.length > 0) {
          await this._insertMedicationsWithConn(conn, id, data.medications);
        }
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getPrescription(id, clinicId);
  }

  async deletePrescription(id, clinicId) {
    const [result] = await db.execute(
      `UPDATE prescriptions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.affectedRows === 0) {
      throw { statusCode: 404, message: 'Prescription not found' };
    }
    return true;
  }

  async _insertMedicationsWithConn(conn, prescriptionId, medications) {
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      await conn.execute(
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
