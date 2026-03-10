const NotificationRepository = require('../repositories/NotificationRepository');
const MockEmailService = require('./MockEmailService');
const { formatUSD } = require('../utils/currency');
const db = require('../config/database');

class NotificationService {
  // Called when a purchased stock transaction is created
  async createPaymentDueNotification(transaction, supplier, item, clinicId) {
    const amount = formatUSD(transaction.total_cost_cents);
    const dueDateText = new Date(transaction.payment_due_date)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    await NotificationRepository.create({
      clinic_id: clinicId,
      type: 'payment_due',
      title: `Payment Due — ${supplier.name}`,
      message: `Payment of ${amount} due on ${dueDateText} for ${item.item_name}`,
      reference_id: transaction.id,
      reference_type: 'inventory_transaction',
      due_date: transaction.payment_due_date,
    });

    // Mock email
    await MockEmailService.sendPaymentReminder({
      to: supplier.email,
      supplier: supplier.name,
      amount,
      dueDate: dueDateText,
      item: item.item_name,
    });
  }

  // Run this check on every page load of inventory or notifications
  // Updates pending → overdue if due date has passed
  async checkAndUpdateOverdue(clinicId) {
    const today = new Date().toISOString().slice(0, 10);
    
    // Update notifications
    await db.execute(`
      UPDATE notifications
      SET type = 'payment_overdue',
          title = REPLACE(title, 'Payment Due', 'Payment Overdue')
      WHERE clinic_id = ?
        AND type = 'payment_due'
        AND due_date < ?
        AND deleted_at IS NULL
    `, [clinicId, today]);

    // Also update inventory_transactions
    await db.execute(`
      UPDATE inventory_transactions
      SET payment_status = 'overdue'
      WHERE clinic_id = ?
        AND stock_type = 'purchased'
        AND payment_status = 'pending'
        AND payment_due_date < ?
    `, [clinicId, today]);
  }

  async getUnreadCount(clinicId, userId) {
    return await NotificationRepository.getUnreadCount(clinicId, userId);
  }

  async getNotifications(clinicId, userId) {
    await this.checkAndUpdateOverdue(clinicId);
    return await NotificationRepository.getNotifications(clinicId, userId);
  }

  async markAsRead(id, clinicId) {
    return await NotificationRepository.markAsRead(id, clinicId);
  }

  async markAllAsRead(clinicId, userId) {
    return await NotificationRepository.markAllAsRead(clinicId, userId);
  }
}

module.exports = new NotificationService();
