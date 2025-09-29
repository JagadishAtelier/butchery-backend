// routes/pilotuserRoutes.js
const express = require('express');
const router = express.Router();
const pilotController = require('../controllers/pilotuserauthController');
const { protect, protectPilot, restrictToRole } = require('../middleware/auth');

// --- Basic auth routes for pilots ---
router.post('/register',protect,restrictToRole('admin'), pilotController.register);
router.post('/login', pilotController.login);

// OTP / password reset
router.post('/forgot-password', pilotController.forgotPassword);
router.post('/reset-password', pilotController.resetPassword);

// Protected profile routes
router.get('/profile', protectPilot, pilotController.getProfile);
router.put('/profile', protectPilot, pilotController.updateProfile);
router.put('/password', protectPilot, pilotController.changePassword);

// Get pilot by id (protected — only for admins or authorized users)
router.get('/:id', protectPilot, pilotController.getPilotById);

module.exports = router;
