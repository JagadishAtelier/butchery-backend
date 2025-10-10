// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

// POST /api/message/send
router.post('/send', otpController.sendOtp);
router.post('/verify', otpController.verifyOtp);

module.exports = router;
