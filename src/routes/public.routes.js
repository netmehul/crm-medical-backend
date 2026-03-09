const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanController');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/plans', asyncHandler((req, res) => PlanController.getPublic(req, res)));

module.exports = router;
