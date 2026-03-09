const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanController');
const platformAuth = require('../middleware/platformAuth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(platformAuth);

router.get('/', asyncHandler((req, res) => PlanController.getAll(req, res)));
router.post('/', asyncHandler((req, res) => PlanController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => PlanController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => PlanController.update(req, res)));
router.post('/:id/duplicate', asyncHandler((req, res) => PlanController.duplicate(req, res)));
router.delete('/:id', asyncHandler((req, res) => PlanController.delete(req, res)));

module.exports = router;
