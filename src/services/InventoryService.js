const db = require('../config/database');
const { generateId } = require('../utils/uuid');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const NotificationService = require('./NotificationService');
const SupplierRepository = require('../repositories/SupplierRepository');

class InventoryService {
  async getItems(clinicId, query) {
    const { page, limit, offset, sqlLimit, sqlOffset } = getPagination(query);

    let where = 'i.clinic_id = ? AND i.deleted_at IS NULL';
    const params = [clinicId];

    if (query.search) {
      where += ' AND i.item_name LIKE ?';
      params.push(`%${query.search}%`);
    }
    if (query.category) {
      where += ' AND i.category = ?';
      params.push(query.category);
    }

    const [rows] = await db.execute(
      `SELECT i.*, s.name as supplier_name 
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, sqlLimit, sqlOffset]
    );

    // Get stock split for each item
    for (let row of rows) {
      const [splits] = await db.execute(
        `SELECT stock_type, SUM(quantity) as total_qty 
         FROM inventory_transactions 
         WHERE inventory_id = ? AND clinic_id = ?
         GROUP BY stock_type`,
        [row.id, clinicId]
      );
      row.split = splits.reduce((acc, s) => {
        acc[s.stock_type] = s.total_qty;
        return acc;
      }, { purchased: 0, sample: 0 });
    }

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM inventory i WHERE ${where}`,
      params
    );

    return paginatedResponse(rows, countRows[0].total, page, limit);
  }

  async getItem(id, clinicId) {
    const [rows] = await db.execute(
      `SELECT i.*, s.name as supplier_name 
       FROM inventory i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       WHERE i.id = ? AND i.clinic_id = ? AND i.deleted_at IS NULL`,
      [id, clinicId]
    );
    const item = rows[0];
    if (!item) throw { statusCode: 404, message: 'Inventory item not found' };

    // Get split
    const [splits] = await db.execute(
      `SELECT stock_type, SUM(quantity) as total_qty 
       FROM inventory_transactions 
       WHERE inventory_id = ? AND clinic_id = ?
       GROUP BY stock_type`,
      [id, clinicId]
    );
    item.split = splits.reduce((acc, s) => {
      acc[s.stock_type] = s.total_qty;
      return acc;
    }, { purchased: 0, sample: 0 });

    return item;
  }

  async createItem(clinicId, data, userId = null) {
    const id = generateId();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const supplier_id = (data.supplier || data.supplier_id || "").trim() || null;
    const qty = Number(data.quantity || 0);
    const cost = Number(data.cost_per_unit_cents || 0);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO inventory
           (id, clinic_id, item_name, category, quantity, unit, low_stock_threshold, notes, supplier_id, cost_per_unit_cents, selling_price_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, clinicId, data.item_name, data.category || 'other',
          qty, data.unit || null,
          data.low_stock_threshold || data.reorder_level || 10,
          data.notes || null, supplier_id, cost, data.selling_price_cents || 0, now, now]
      );

      if (qty > 0 && cost > 0 && supplier_id) {
        const tx_id = generateId();
        const total_cost = qty * cost;
        await conn.execute(
          `INSERT INTO inventory_transactions 
            (id, clinic_id, inventory_id, type, quantity, reason, performed_by, stock_type, unit_cost_cents, total_cost_cents, supplier_id, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tx_id, clinicId, id, 'in', qty, 'Initial Stock', userId, 'purchased', cost, total_cost, supplier_id, 'pending', now]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getItem(id, clinicId);
  }

  async updateItem(id, clinicId, data, userId = null) {
    const existing = await this.getItem(id, clinicId);

    const allowed = {};
    const fields = ['item_name', 'category', 'quantity', 'unit', 'low_stock_threshold', 'notes', 'supplier_id', 'cost_per_unit_cents', 'selling_price_cents'];
    for (const f of fields) {
      if (data[f] !== undefined) {
        if (f === 'supplier_id') {
          allowed[f] = (data[f] || "").trim() || null;
        } else {
          allowed[f] = data[f];
        }
      }
    }
    if (data.reorder_level !== undefined) allowed.low_stock_threshold = data.reorder_level;

    if (Object.keys(allowed).length === 0) return await this.getItem(id, clinicId);

    allowed.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClause = Object.keys(allowed).map(k => `${k} = ?`).join(', ');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE inventory SET ${setClause} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
        [...Object.values(allowed), id, clinicId]
      );

      // Sync or Create the 'Initial Stock' transaction
      const newQty = allowed.quantity !== undefined ? allowed.quantity : existing.quantity;
      const newCost = allowed.cost_per_unit_cents !== undefined ? allowed.cost_per_unit_cents : (existing.cost_per_unit_cents || 0);
      const newSupplier = allowed.supplier_id !== undefined ? allowed.supplier_id : existing.supplier_id;

      const [txs] = await conn.execute(
        `SELECT id FROM inventory_transactions 
         WHERE inventory_id = ? AND clinic_id = ? AND reason = 'Initial Stock' AND payment_status = 'pending'`,
        [id, clinicId]
      );
      
      if (txs.length > 0) {
        const tx = txs[0];
        const newTotal = Number(newQty) * Number(newCost);
        await conn.execute(
          `UPDATE inventory_transactions 
           SET quantity = ?, unit_cost_cents = ?, total_cost_cents = ?, supplier_id = ? 
           WHERE id = ? AND clinic_id = ?`,
          [newQty, newCost, newTotal, newSupplier, tx.id, clinicId]
        );
      } else if (newQty > 0 && newCost > 0 && newSupplier) {
        // Create it if it didn't exist (e.g. item was created with 0 qty/cost originally)
        const tx_id = generateId();
        const total_cost = Number(newQty) * Number(newCost);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await conn.execute(
          `INSERT INTO inventory_transactions 
            (id, clinic_id, inventory_id, type, quantity, reason, performed_by, stock_type, unit_cost_cents, total_cost_cents, supplier_id, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tx_id, clinicId, id, 'in', newQty, 'Initial Stock', userId, 'purchased', newCost, total_cost, newSupplier, 'pending', now]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getItem(id, clinicId);
  }

  async deleteItem(id, clinicId) {
    const [result] = await db.execute(
      `UPDATE inventory SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
      [id, clinicId]
    );
    if (result.affectedRows === 0) throw { statusCode: 404, message: 'Inventory item not found' };
    return true;
  }

  async stockTransaction(id, clinicId, userId, data) {
    const { type, quantity, reason, stock_type = 'purchased', unit_cost_cents = 0, supplier_id = null, supplier_visit_id = null, invoice_number = null, invoice_date = null, payment_due_date = null } = data;
    const item = await this.getItem(id, clinicId);

    let newQuantity;
    if (type === 'in' || type === 'stock_in') {
      newQuantity = item.quantity + quantity;
    } else if (type === 'out' || type === 'stock_out') {
      if (item.quantity < quantity) throw { statusCode: 400, message: 'Insufficient stock' };
      newQuantity = item.quantity - quantity;
    } else {
      throw { statusCode: 400, message: 'Transaction type must be "in" or "out"' };
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const tx_id = generateId();

    const isStockIn = (type === 'in' || type === 'stock_in');
    const isSample = stock_type === 'sample';
    
    const final_unit_cost = isSample ? 0 : unit_cost_cents;
    const total_cost_cents = final_unit_cost * quantity;
    const status = isSample ? 'na' : (isStockIn ? 'pending' : 'na');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`,
        [newQuantity, now, id, clinicId]
      );

      await conn.execute(
        `INSERT INTO inventory_transactions 
          (id, clinic_id, inventory_id, type, quantity, reason, performed_by, stock_type, unit_cost_cents, total_cost_cents, supplier_id, supplier_visit_id, invoice_number, invoice_date, payment_due_date, payment_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx_id, clinicId, id, type, quantity, reason || null, userId, stock_type, final_unit_cost, total_cost_cents, supplier_id, supplier_visit_id, invoice_number, invoice_date, payment_due_date, status, now]
      );

      await conn.commit();

      // Post-commit: Notification for purchased stock-in
      if (isStockIn && !isSample && supplier_id) {
        const supplier = await SupplierRepository.findById(supplier_id, clinicId);
        if (supplier) {
          const transaction = { id: tx_id, total_cost_cents, payment_due_date };
          await NotificationService.createPaymentDueNotification(transaction, supplier, item, clinicId);
        }
      }
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return await this.getItem(id, clinicId);
  }

  async markAsPaid(transactionId, clinicId, { paid_amount_cents, notes = '' }) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `UPDATE inventory_transactions 
       SET payment_status = 'paid', paid_at = ?, paid_amount_cents = ?, notes = IFNULL(CONCAT(notes, '\n', ?), ?)
       WHERE id = ? AND clinic_id = ?`,
      [now, paid_amount_cents, notes, notes, transactionId, clinicId]
    );
    return true;
  }

  async getSupplierReport(clinicId) {
    const SupplierService = require('./SupplierService');
    return await SupplierService.getFullSupplierReport(clinicId);
  }

  async getPaymentSummary(clinicId) {
    const [rows] = await db.execute(`
      SELECT 
        IFNULL(SUM(CASE WHEN payment_status = 'pending' THEN total_cost_cents - paid_amount_cents ELSE 0 END), 0) as total_pending_cents,
        IFNULL(SUM(CASE WHEN payment_status = 'overdue' THEN total_cost_cents - paid_amount_cents ELSE 0 END), 0) as total_overdue_cents,
        IFNULL(SUM(CASE WHEN payment_status = 'paid' THEN paid_amount_cents ELSE 0 END), 0) as total_paid_cents
      FROM inventory_transactions
      WHERE clinic_id = ? AND stock_type = 'purchased'
    `, [clinicId]);
    return rows[0] || { total_pending_cents: 0, total_overdue_cents: 0, total_paid_cents: 0 };
  }

  async getLowStock(clinicId) {
    const [rows] = await db.execute(
      `SELECT * FROM inventory
       WHERE clinic_id = ? AND deleted_at IS NULL AND quantity <= low_stock_threshold
       ORDER BY quantity ASC`,
      [clinicId]
    );
    return rows;
  }
}

module.exports = new InventoryService();
