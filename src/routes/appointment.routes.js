const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/AppointmentController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(requireClinic);

router.get('/',    asyncHandler((req, res) => AppointmentController.getAll(req, res)));
router.post('/',   planGate('appointmentsPerMonth'), asyncHandler((req, res) => AppointmentController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => AppointmentController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => AppointmentController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => AppointmentController.delete(req, res)));

module.exports = router;
