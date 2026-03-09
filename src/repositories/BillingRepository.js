const BaseRepository = require('./BaseRepository');

class BillingRepository extends BaseRepository {
  constructor() {
    super('patient_billing');
  }

  async findByPatient(patientId, clinicId, { limit = 20, offset = 0 } = {}) {
    const [rows] = await this.db.execute(
      `SELECT * FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, clinicId, sqlLimit, sqlOffset]
    );

    const [countRows] = await this.db.execute(
      `SELECT COUNT(*) as total FROM ${this.table}
       WHERE patient_id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [patientId, clinicId]
    );

    return { rows, total: countRows[0].total };
  }

  async getLastInvoiceNumber(clinicId) {
    const [rows] = await this.db.execute(
      `SELECT invoice_number FROM ${this.table}
       WHERE clinic_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [clinicId]
    );
    return rows[0] ? rows[0].invoice_number : null;
  }

  async updatePayment(id, clinicId, { paid_amount, payment_status, payment_method, paid_at }) {
    await this.db.execute(
      `UPDATE ${this.table}
       SET paid_amount = ?, payment_status = ?, payment_method = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [paid_amount, payment_status, payment_method, paid_at, id, clinicId]
    );
    return this.findById(id, clinicId);
  }
}

module.exports = new BillingRepository();
