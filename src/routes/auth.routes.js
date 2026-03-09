const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const auth = require('../middleware/auth');
const planGate = require('../middleware/planGate');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/signup', asyncHandler((req, res) => AuthController.signup(req, res)));
router.post('/login',  asyncHandler((req, res) => AuthController.login(req, res)));

router.post('/branch-select', auth, asyncHandler((req, res) => AuthController.branchSelect(req, res)));
router.get('/me',             auth, asyncHandler((req, res) => AuthController.getMe(req, res)));
router.post('/invite',        auth, planGate('seats'), asyncHandler((req, res) => AuthController.invite(req, res)));

module.exports = router;
