const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Full dashboard payload
router.get('/',  dashboardController.getDashboard);


module.exports = router;
