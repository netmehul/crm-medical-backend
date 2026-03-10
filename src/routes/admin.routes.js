const express = require('express');
const router = express.Router();
const PlatformAdminController = require('../controllers/PlatformAdminController');
const platformAuth = require('../middleware/platformAuth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(platformAuth);

router.get('/dashboard', asyncHandler((req, res) => PlatformAdminController.dashboard(req, res)));
router.get('/organizations', asyncHandler((req, res) => PlatformAdminController.listOrgs(req, res)));
router.get('/organizations/:id', asyncHandler((req, res) => PlatformAdminController.getOrg(req, res)));
router.put('/organizations/:id/plan', asyncHandler((req, res) => PlatformAdminController.updatePlan(req, res)));
router.put('/organizations/:id/status', asyncHandler((req, res) => PlatformAdminController.updateStatus(req, res)));

router.use('/plans', require('./plan.routes'));

module.exports = router;
