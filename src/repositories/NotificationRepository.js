const BaseRepository = require('./BaseRepository');

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async getUnreadCount(clinicId, userId = null) {
    let query = `SELECT COUNT(*) as total FROM notifications WHERE clinic_id = ? AND is_read = 0 AND deleted_at IS NULL`;
    const params = [clinicId];

    if (userId) {
      query += ` AND (user_id = ? OR user_id IS NULL)`;
      params.push(userId);
    }

    const [rows] = await this.db.execute(query, params);
    return rows[0].total;
  }

  async markAsRead(id, clinicId) {
    await this.db.execute(
      `UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND clinic_id = ?`,
      [id, clinicId]
    );
    return true;
  }

  async markAllAsRead(clinicId, userId = null) {
    let query = `UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE clinic_id = ? AND is_read = 0`;
    const params = [clinicId];

    if (userId) {
      query += ` AND (user_id = ? OR user_id IS NULL)`;
      params.push(userId);
    }

    await this.db.execute(query, params);
    return true;
  }

  async getNotifications(clinicId, userId = null) {
    let query = `SELECT * FROM notifications WHERE clinic_id = ? AND deleted_at IS NULL`;
    const params = [clinicId];

    if (userId) {
      query += ` AND (user_id = ? OR user_id IS NULL)`;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const [rows] = await this.db.execute(query, params);
    return rows;
  }
}

module.exports = new NotificationRepository();
