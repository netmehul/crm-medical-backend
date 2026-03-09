const express = require('express');
const router = express.Router();
const PatientFileController = require('../controllers/PatientFileController');
const ReportController = require('../controllers/ReportController');
const NoteController = require('../controllers/NoteController');
const BillingController = require('../controllers/BillingController');
const auth = require('../middleware/auth');
const requireClinic = require('../middleware/requireClinic');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');
const multer = require('multer');
const path = require('path');

const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { patientId } = req.params;
    const clinicId = req.clinicId; // Available via auth middleware
    const uploadDir = path.join(__dirname, `../../public/uploads/clinic_${clinicId}/patient_${patientId}/reports`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const roleGuard = require('../middleware/roleGuard');

// ... imports

router.use(auth);
router.use(requireClinic);

router.get('/:patientId', asyncHandler((req, res) => PatientFileController.getFile(req, res)));
router.put('/:patientId', asyncHandler((req, res) => PatientFileController.updateFile(req, res)));

// Reports (Pro only)
router.get('/:patientId/reports', planGate('reportUploads'), asyncHandler((req, res) => ReportController.getAll(req, res)));
router.post('/:patientId/reports', planGate('reportUploads'), upload.single('file'), asyncHandler((req, res) => ReportController.upload(req, res)));
router.delete('/:patientId/reports/:id', planGate('reportUploads'), asyncHandler((req, res) => ReportController.delete(req, res)));

// Notes
router.get('/:patientId/notes', asyncHandler((req, res) => NoteController.getAll(req, res)));
router.post('/:patientId/notes', asyncHandler((req, res) => NoteController.create(req, res)));
router.put('/:patientId/notes/:id', asyncHandler((req, res) => NoteController.update(req, res)));
router.delete('/:patientId/notes/:id', asyncHandler((req, res) => NoteController.delete(req, res)));

// Billing (Pro only)
router.get('/:patientId/billing', planGate('billing'), asyncHandler((req, res) => BillingController.getAll(req, res)));
router.post('/:patientId/billing', planGate('billing'), roleGuard('org_admin', 'doctor'), asyncHandler((req, res) => BillingController.create(req, res)));
router.put('/:patientId/billing/:id', planGate('billing'), roleGuard('org_admin', 'doctor'), asyncHandler((req, res) => BillingController.update(req, res)));
router.delete('/:patientId/billing/:id', planGate('billing'), roleGuard('org_admin', 'doctor'), asyncHandler((req, res) => BillingController.delete(req, res)));

module.exports = router;
