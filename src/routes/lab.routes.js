const express = require('express');
const router = express.Router();
const LabController = require('../controllers/LabController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(requireClinic);

router.get('/active', asyncHandler((req, res) => LabController.getAllActive(req, res)));
router.get('/',       asyncHandler((req, res) => LabController.getAll(req, res)));
router.post('/',      asyncHandler((req, res) => LabController.create(req, res)));
router.get('/:id',    asyncHandler((req, res) => LabController.getOne(req, res)));
router.put('/:id',    asyncHandler((req, res) => LabController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => LabController.delete(req, res)));

module.exports = router;
