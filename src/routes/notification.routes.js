const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(requireClinic);

router.get('/', asyncHandler((req, res) => NotificationController.list(req, res)));
router.get('/unread-count', asyncHandler((req, res) => NotificationController.getUnreadCount(req, res)));
router.put('/:id/read', asyncHandler((req, res) => NotificationController.markAsRead(req, res)));
router.put('/read-all', asyncHandler((req, res) => NotificationController.markAllAsRead(req, res)));

module.exports = router;
