const express = require('express');
const router = express.Router();
const PrescriptionController = require('../controllers/PrescriptionController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);

router.get('/',    asyncHandler((req, res) => PrescriptionController.getAll(req, res)));
router.post('/',   asyncHandler((req, res) => PrescriptionController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => PrescriptionController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => PrescriptionController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => PrescriptionController.delete(req, res)));

module.exports = router;
