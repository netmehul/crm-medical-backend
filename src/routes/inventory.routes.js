const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const auth = require('../middleware/auth');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(planGate('inventory'));

router.get('/',          asyncHandler((req, res) => InventoryController.getAll(req, res)));
router.get('/low-stock', asyncHandler((req, res) => InventoryController.getLowStock(req, res)));
router.post('/',         asyncHandler((req, res) => InventoryController.create(req, res)));
router.get('/:id',       asyncHandler((req, res) => InventoryController.getOne(req, res)));
router.put('/:id',       asyncHandler((req, res) => InventoryController.update(req, res)));
router.delete('/:id',    asyncHandler((req, res) => InventoryController.delete(req, res)));
router.post('/:id/stock', asyncHandler((req, res) => InventoryController.stockTransaction(req, res)));

module.exports = router;
