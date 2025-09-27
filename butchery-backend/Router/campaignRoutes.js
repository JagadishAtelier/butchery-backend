const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { syncGoogleCampaignData } = require("../controllers/campaignController");

router.get("/sync/google", syncGoogleCampaignData);
router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaignById);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);

module.exports = router;
