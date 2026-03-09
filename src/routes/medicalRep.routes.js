const express = require('express');
const router = express.Router();
const MedicalRepController = require('../controllers/MedicalRepController');
const auth = require('../middleware/auth');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(planGate('mrManagement'));

router.get('/',    asyncHandler((req, res) => MedicalRepController.getAll(req, res)));
router.post('/',   asyncHandler((req, res) => MedicalRepController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => MedicalRepController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => MedicalRepController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => MedicalRepController.delete(req, res)));
router.post('/:id/visits', asyncHandler((req, res) => MedicalRepController.logVisit(req, res)));
router.get('/:id/visits',  asyncHandler((req, res) => MedicalRepController.getVisits(req, res)));

module.exports = router;
