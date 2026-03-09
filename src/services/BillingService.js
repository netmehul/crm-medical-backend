const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class BillingService {
  async getBills(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    let where = 'b.clinic_id = ? AND b.deleted_at IS NULL';
    const params = [clinicId];

    if (query.patient_id) {
      where += ' AND b.patient_id = ?';
      params.push(query.patient_id);
    }
    if (query.payment_status) {
      where += ' AND b.payment_status = ?';
      params.push(query.payment_status);
    }

    const [rows] = await db.execute(
      `SELECT b.*, p.full_name AS patient_name, p.patient_code
       FROM patient_billing b
       JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
       WHERE ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM patient_billing b WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getBill(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT b.*, p.full_name AS patient_name, p.patient_code
       FROM patient_billing b
       JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
       WHERE b.id = ? AND b.clinic_id = ? AND b.deleted_at IS NULL`,
      [id, clinicId]
    );
    const row = rows[0];
    if (!row) throw { statusCode: 404, message: 'Invoice not found' };
    return row;
  }

  async _getNextInvoiceNumber(clinicId) {
    const [rows] = await db.execute(
      `SELECT invoice_number FROM patient_billing
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [clinicId]
    );
    const last = rows[0]?.invoice_number;
    let nextNum = 1;
    if (last) {
      const match = last.match(/INV-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `INV-${String(nextNum).padStart(6, '0')}`;
  }

  async createInvoice(clinicId, userId, data) {
    const id = generateId();
    const invoiceNumber = await this._getNextInvoiceNumber(clinicId);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      `INSERT INTO patient_billing
         (id, clinic_id, patient_id, appointment_id, invoice_number,
          total_amount, paid_amount, payment_status, payment_method, notes,
          created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId, data.patient_id, data.appointment_id || null, invoiceNumber,
        data.total_amount, data.paid_amount || 0,
        data.payment_status || 'unpaid', data.payment_method || null,
        data.notes || null, userId, now, now,
      ]
    );

    return await this.getBill(id, clinicId);
  }

  async updatePayment(id, clinicId, data) {
    const existing = await this.getBill(id, clinicId);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const updates = {
      paid_amount: data.paid_amount ?? existing.paid_amount,
      payment_status: data.payment_status ?? existing.payment_status,
      payment_method: data.payment_method ?? existing.payment_method,
      paid_at: data.paid_at || existing.paid_at,
      updated_at: now,
    };

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.execute(
      `UPDATE patient_billing SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(updates), id, clinicId]
    );

    return await this.getBill(id, clinicId);
  }

  async deleteInvoice(id, clinicId) {
    const [result] = await db.execute(
      `UPDATE patient_billing SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.affectedRows === 0) throw { statusCode: 404, message: 'Invoice not found' };
    return true;
  }
}

module.exports = new BillingService();
