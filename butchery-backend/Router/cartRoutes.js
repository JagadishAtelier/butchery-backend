const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protect } = require("../middleware/auth"); // ✅ fixed

router.post("/add", protect, cartController.addToCart);
router.get("/", protect, cartController.getCart);
router.delete("/remove/:productId", protect, cartController.removeFromCart);

module.exports = router;
