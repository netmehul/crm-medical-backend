const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');

class BillingService {
  _generateInvoiceNumber(clinicId) {
    const year = new Date().getFullYear();
    const row = db.get(
      `SELECT invoice_number FROM patient_billing
       WHERE clinic_id = ? AND deleted_at IS NULL AND invoice_number LIKE ?
       ORDER BY created_at DESC LIMIT 1`,
      [clinicId, `INV-${year}-%`]
    );

    let nextNum = 1;
    if (row && row.invoice_number) {
      const match = row.invoice_number.match(/INV-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  async getInvoices(patientId, clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const rows = db.all(
      `SELECT b.*, p.full_name AS patient_name
       FROM patient_billing b
       LEFT JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
       WHERE b.patient_id = ? AND b.clinic_id = ? AND b.deleted_at IS NULL
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM patient_billing
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async getClinicInvoices(clinicId, query) {
    const { page, limit, offset } = getPagination(query);

    const rows = db.all(
      `SELECT b.*, p.full_name AS patient_name
       FROM patient_billing b
       LEFT JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
       WHERE b.clinic_id = ? AND b.deleted_at IS NULL
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );

    const { total } = db.get(
      `SELECT COUNT(*) AS total FROM patient_billing
       WHERE clinic_id = ? AND deleted_at IS NULL`,
      [clinicId]
    );

    return paginatedResponse(rows, total, page, limit);
  }

  async createInvoice(patientId, clinicId, userId, data) {
    const file = db.get(
      `SELECT id FROM patient_files WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    if (!file) throw { statusCode: 404, message: 'Patient file not found' };

    const invoiceNumber = this._generateInvoiceNumber(clinicId);
    const id = generateId();
    const now = new Date().toISOString();

    const lineItems = data.line_items ? JSON.stringify(data.line_items) : null;
    const subtotal = data.subtotal || data.total_amount || 0;
    const taxPercent = data.tax_percent || 0;
    const taxAmount = data.tax_amount || (subtotal * taxPercent / 100);
    const discountAmount = data.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    db.run(
      `INSERT INTO patient_billing
         (id, clinic_id, patient_id, file_id, appointment_id, invoice_number, invoice_date,
          due_date, line_items, subtotal, tax_percent, tax_amount, discount_amount, total_amount,
          payment_status, payment_method, paid_amount, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, clinicId, patientId, file.id, data.appointment_id || null,
        invoiceNumber, data.invoice_date || now, data.due_date || null,
        lineItems, subtotal, taxPercent, taxAmount, discountAmount, totalAmount,
        data.payment_status || 'draft', data.payment_method || null,
        data.paid_amount || 0, data.notes || null, userId, now, now,
      ]
    );

    return db.get(`SELECT * FROM patient_billing WHERE id = ? AND deleted_at IS NULL`, [id]);
  }

  async updateInvoice(id, clinicId, data) {
    const existing = db.get(
      `SELECT * FROM patient_billing WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!existing) throw { statusCode: 404, message: 'Invoice not found' };

    const allowed = {};
    const fields = [
      'total_amount', 'paid_amount', 'payment_status', 'payment_method',
      'invoice_date', 'due_date', 'notes', 'line_items', 'subtotal',
      'tax_percent', 'tax_amount', 'discount_amount',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) {
        allowed[f] = f === 'line_items' ? JSON.stringify(data[f]) : data[f];
      }
    }

    if (Object.keys(allowed).length === 0) return existing;

    allowed.updated_at = new Date().toISOString();
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
    db.run(
      `UPDATE patient_billing SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [...Object.values(allowed), id, clinicId]
    );

    return db.get(`SELECT * FROM patient_billing WHERE id = ? AND deleted_at IS NULL`, [id]);
  }

  async recordPayment(id, clinicId, paymentData) {
    const existing = db.get(
      `SELECT * FROM patient_billing WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (!existing) throw { statusCode: 404, message: 'Invoice not found' };

    const now = new Date().toISOString();
    db.run(
      `UPDATE patient_billing
       SET paid_amount = ?, payment_status = ?, payment_method = ?, paid_at = ?, updated_at = ?
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [
        paymentData.paid_amount, paymentData.payment_status || 'paid',
        paymentData.payment_method || null, now, now, id, clinicId,
      ]
    );

    return db.get(`SELECT * FROM patient_billing WHERE id = ? AND deleted_at IS NULL`, [id]);
  }

  async deleteInvoice(id, clinicId) {
    const result = db.run(
      `UPDATE patient_billing SET deleted_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.changes === 0) throw { statusCode: 404, message: 'Invoice not found' };
    return true;
  }
}

module.exports = new BillingService();
