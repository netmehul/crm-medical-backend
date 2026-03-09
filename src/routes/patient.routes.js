const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/PatientController');
const auth = require('../middleware/auth');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);

router.get('/',    asyncHandler((req, res) => PatientController.getAll(req, res)));
router.post('/',   planGate('patients'), asyncHandler((req, res) => PatientController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => PatientController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => PatientController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => PatientController.delete(req, res)));

module.exports = router;
