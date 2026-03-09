const express            = require('express');
const router             = express.Router();
const ReferralController = require('../controllers/ReferralController');
const auth               = require('../middleware/auth');
const planGate           = require('../middleware/planGate');
const asyncHandler       = require('../middleware/asyncHandler');

router.use(auth);

router.get('/',    asyncHandler((req, res) => ReferralController.getAll(req, res)));
router.post('/',   planGate('referralsPerMonth'), asyncHandler((req, res) => ReferralController.create(req, res)));
router.get('/:id', asyncHandler((req, res) => ReferralController.getOne(req, res)));
router.put('/:id', asyncHandler((req, res) => ReferralController.update(req, res)));
router.delete('/:id', asyncHandler((req, res) => ReferralController.delete(req, res)));

router.post('/:id/generate-letter', asyncHandler((req, res) => ReferralController.generateLetter(req, res)));
router.get('/:id/letter',           asyncHandler((req, res) => ReferralController.downloadLetter(req, res)));

router.post('/:id/send',            planGate('labCommunication'), asyncHandler((req, res) => ReferralController.send(req, res)));
router.patch('/:id/status',         asyncHandler((req, res) => ReferralController.updateStatus(req, res)));
router.get('/:id/communications',   asyncHandler((req, res) => ReferralController.getCommunications(req, res)));

module.exports = router;
