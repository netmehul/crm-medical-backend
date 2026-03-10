const BaseRepository = require('./BaseRepository');

class SupplierRepository extends BaseRepository {
  constructor() {
    super('suppliers');
  }

  async getVisits(supplierId, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT * FROM supplier_visits 
       WHERE supplier_id = ? AND clinic_id = ? AND deleted_at IS NULL
       ORDER BY visit_date DESC`,
      [supplierId, clinicId]
    );
    return rows;
  }

  async createVisit(data) {
    const { generateId } = require('../utils/uuid');
    const id = generateId();
    const record = { id, ...data };

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    await this.db.execute(
      `INSERT INTO supplier_visits (${columns}) VALUES (${placeholders})`,
      values
    );

    const [rows] = await this.db.execute(
      `SELECT * FROM supplier_visits WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  async getBalanceSummary(supplierId, clinicId) {
    const [rows] = await this.db.execute(
      `SELECT 
        IFNULL(SUM(it.total_cost_cents), 0) as total_billed_cents,
        IFNULL(SUM(CASE WHEN it.payment_status = 'pending' THEN it.total_cost_cents - IFNULL(it.paid_amount_cents, 0) ELSE 0 END), 0) as pending_balance_cents,
        IFNULL(SUM(CASE WHEN it.payment_status = 'overdue' THEN it.total_cost_cents - IFNULL(it.paid_amount_cents, 0) ELSE 0 END), 0) as overdue_balance_cents,
        IFNULL(SUM(it.paid_amount_cents), 0) as total_paid_cents
       FROM inventory_transactions it
       WHERE it.supplier_id = ? AND it.clinic_id = ? AND it.stock_type = 'purchased'`,
      [supplierId, clinicId]
    );
    return rows[0];
  }
}

module.exports = new SupplierRepository();
