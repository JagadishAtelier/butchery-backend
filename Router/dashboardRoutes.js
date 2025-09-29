const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Full dashboard payload
router.get('/',protect,  dashboardController.getDashboard);


module.exports = router;
