const express = require('express');
const router = express.Router();
const BillingController = require('../controllers/BillingController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(requireClinic);
router.use(planGate('billing'));

router.get('/', asyncHandler((req, res) => BillingController.getClinicInvoices(req, res)));

module.exports = router;
