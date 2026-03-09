const BaseRepository = require('./BaseRepository');

class BillingRepository extends BaseRepository {
  constructor() {
    super('patient_billing');
  }

  findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const rows = this.db.all(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, limit, offset]
    );
    const { total } = this.db.get(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );
    return { rows, total };
  }

  getLastInvoiceNumber(clinicId) {
    const row = this.db.get(
      `SELECT invoice_number FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return row ? row.invoice_number : null;
  }

  updatePayment(id, clinicId, { paid_amount, payment_status, payment_method, paid_at }) {
    this.db.run(
      `UPDATE ${this.table}
       SET paid_amount = ?, payment_status = ?, payment_method = ?, paid_at = ?, updated_at = datetime('now')
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [paid_amount, payment_status, payment_method, paid_at, id, clinicId]
    );
    return this.findById(id, clinicId);
  }
}

module.exports = new BillingRepository();
