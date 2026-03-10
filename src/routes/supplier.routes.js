const express = require('express');
const router = express.Router();
const SupplierController = require('../controllers/SupplierController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(requireClinic);

router.get('/', asyncHandler((req, res) => SupplierController.list(req, res)));
router.post('/', asyncHandler((req, res) => SupplierController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => SupplierController.detail(req, res)));
router.put('/:id', asyncHandler((req, res) => SupplierController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => SupplierController.delete(req, res)));

router.post('/:id/visits', asyncHandler((req, res) => SupplierController.logVisit(req, res)));
router.get('/:id/visits', asyncHandler((req, res) => SupplierController.getVisits(req, res)));
router.get('/:id/balance', asyncHandler((req, res) => SupplierController.getBalance(req, res)));

module.exports = router;
