const express = require("express");
const router = express.Router();
const controller = require("../controllers/shiprocketController");

router.post("/auth", controller.login);
router.get("/orders", controller.getOrders);
router.post("/assign-awb", controller.assignAwb);
router.post("/schedule-pickup", controller.schedulePickup);
router.get("/track/:id", controller.trackShipment);
router.get("/label/:id", controller.getLabel);

module.exports = router;
