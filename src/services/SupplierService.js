const SupplierRepository = require('../repositories/SupplierRepository');

class SupplierService {
  async getAllSuppliers(clinicId, options = {}) {
    const { rows: suppliers } = await SupplierRepository.findAll(clinicId, options);
    // Enrich each supplier with billing balance from inventory_transactions
    const enriched = await Promise.all(suppliers.map(async (s) => {
      const balance = await SupplierRepository.getBalanceSummary(s.id, clinicId);
      return { ...s, ...balance };
    }));
    return enriched;
  }

  async createSupplier(data) {
    return await SupplierRepository.create(data);
  }

  async getSupplierById(id, clinicId) {
    const supplier = await SupplierRepository.findById(id, clinicId);
    if (!supplier) return null;

    const balance = await SupplierRepository.getBalanceSummary(id, clinicId);
    return { ...supplier, ...balance };
  }

  async updateSupplier(id, clinicId, data) {
    return await SupplierRepository.update(id, clinicId, data);
  }

  async deleteSupplier(id, clinicId) {
    return await SupplierRepository.softDelete(id, clinicId);
  }

  async logVisit(supplierId, clinicId, visitData) {
    return await SupplierRepository.createVisit({
      ...visitData,
      supplier_id: supplierId,
      clinic_id: clinicId
    });
  }

  async getVisitHistory(supplierId, clinicId) {
    return await SupplierRepository.getVisits(supplierId, clinicId);
  }

  async getSupplierBalance(supplierId, clinicId) {
    return await SupplierRepository.getBalanceSummary(supplierId, clinicId);
  }

  async getFullSupplierReport(clinicId) {
    const db = require('../config/database');
    const [rows] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        COUNT(it.id) as item_entries,
        IFNULL(SUM(it.total_cost_cents), 0) as total_billed_cents,
        IFNULL(SUM(CASE WHEN it.payment_status = 'pending' THEN it.total_cost_cents - IFNULL(it.paid_amount_cents, 0) ELSE 0 END), 0) as pending_balance_cents,
        IFNULL(SUM(CASE WHEN it.payment_status = 'overdue' THEN it.total_cost_cents - IFNULL(it.paid_amount_cents, 0) ELSE 0 END), 0) as overdue_balance_cents,
        IFNULL(SUM(it.paid_amount_cents), 0) as total_paid_cents
      FROM suppliers s
      LEFT JOIN inventory_transactions it ON it.supplier_id = s.id AND it.stock_type = 'purchased'
      WHERE s.clinic_id = ? AND s.deleted_at IS NULL
      GROUP BY s.id
    `, [clinicId]);

    return rows;
  }
}

module.exports = new SupplierService();
