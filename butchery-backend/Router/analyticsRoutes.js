const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics");

router.get("/top-products", analyticsController.getTopSellingProducts);
router.get("/sales-summary", analyticsController.getSalesSummary);
router.get("/unique-visitors", analyticsController.getUniqueVisitors);

module.exports = router;
