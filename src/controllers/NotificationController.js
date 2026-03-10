const NotificationService = require('../services/NotificationService');
const { success } = require('../utils/apiResponse');

class NotificationController {
  async list(req, res) {
    const notifications = await NotificationService.getNotifications(req.clinicId, req.user.id);
    return success(res, notifications);
  }

  async getUnreadCount(req, res) {
    const count = await NotificationService.getUnreadCount(req.clinicId, req.user.id);
    return success(res, { unread_count: count });
  }

  async markAsRead(req, res) {
    await NotificationService.markAsRead(req.params.id, req.clinicId);
    return success(res, null, 'Notification marked as read');
  }

  async markAllAsRead(req, res) {
    await NotificationService.markAllAsRead(req.clinicId, req.user.id);
    return success(res, null, 'All notifications marked as read');
  }
}

module.exports = new NotificationController();
