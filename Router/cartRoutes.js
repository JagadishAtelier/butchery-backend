const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protect } = require("../middleware/auth"); // ✅ fixed

router.post("/add", protect, cartController.addToCart);
router.get("/", protect, cartController.getCart);
router.get("/carduser", protect, cartController.getCartByUserId);
router.delete("/remove/:productId", protect, cartController.removeFromCart);
router.put("/update/:itemId", protect, cartController.updateCartItem);

module.exports = router;
