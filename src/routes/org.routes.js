const express = require('express');
const router = express.Router();
const OrgController = require('../controllers/OrgController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.use(roleGuard('org_admin'));

router.get('/branches',      asyncHandler((req, res) => OrgController.getBranches(req, res)));
router.get('/branches/:id',  asyncHandler((req, res) => OrgController.getBranch(req, res)));
router.post('/branches',     asyncHandler((req, res) => OrgController.createBranch(req, res)));
router.put('/branches/:id',  asyncHandler((req, res) => OrgController.updateBranch(req, res)));

router.get('/team',              asyncHandler((req, res) => OrgController.getTeam(req, res)));
router.get('/team/:userId',      asyncHandler((req, res) => OrgController.getTeamMember(req, res)));
router.post('/team/invite',      planGate('seats'), asyncHandler((req, res) => OrgController.inviteUser(req, res)));
router.put('/team/:userId',      asyncHandler((req, res) => OrgController.updateUser(req, res)));
router.delete('/team/:userId',   asyncHandler((req, res) => OrgController.deactivateUser(req, res)));

router.get('/subscription',      asyncHandler((req, res) => OrgController.getSubscription(req, res)));

module.exports = router;
