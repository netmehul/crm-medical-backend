const express = require('express');
const router = express.Router();

router.use('/auth',          require('./auth.routes'));
router.use('/public',        require('./public.routes'));
router.use('/admin',         require('./admin.routes'));
router.use('/org',           require('./org.routes'));
router.use('/patients',      require('./patient.routes'));
router.use('/patient-files', require('./patientFile.routes'));
router.use('/appointments',  require('./appointment.routes'));
router.use('/prescriptions', require('./prescription.routes'));
router.use('/billing',       require('./billing.routes'));
router.use('/inventory',     require('./inventory.routes'));
router.use('/medical-reps',  require('./medicalRep.routes'));
router.use('/payments',      require('./payment.routes'));
router.use('/labs',           require('./lab.routes'));
router.use('/referrals',      require('./referral.routes'));
router.use('/suppliers',      require('./supplier.routes'));
router.use('/notifications',  require('./notification.routes'));

module.exports = router;
