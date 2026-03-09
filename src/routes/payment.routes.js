const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const roleGuard = require('../middleware/roleGuard');

router.use(auth);
router.use(requireClinic);
router.use(roleGuard('org_admin'));

router.post('/upgrade', asyncHandler((req, res) => PaymentController.upgrade(req, res)));
router.get('/history', asyncHandler((req, res) => PaymentController.getHistory(req, res)));

module.exports = router;
