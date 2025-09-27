const express = require("express");
const router = express.Router();
const controller = require("../controllers/shippingAnalyticsController");

router.get("/shipping", controller.getShippingOverview);
router.get("/shipping/courier", controller.getCourierPerformance);
router.get("/shipping/region", controller.getRegionStats);
router.get("/shipping/trends", controller.getShipmentTrends);

module.exports = router;
