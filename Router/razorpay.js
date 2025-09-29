const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();
require("dotenv").config();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RNK9XtSrh66IwC",
  key_secret: process.env.RAZORPAY_SECRET || "OJvGrVaiGKkTRa6fcCWCLWS4",
});

router.post("/create-order", async (req, res) => {
    console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
console.log("Razorpay Secret:", process.env.RAZORPAY_SECRET);
  try {
    const { amount, currency = "INR" } = req.body;
    console.log("Creating order with amount:", amount, "currency:", currency);
    const options = {
      amount: amount,
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET || "OJvGrVaiGKkTRa6fcCWCLWS4")
      .update(sign)
      .digest("hex");

    if (expectedSign === razorpay_signature) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; // ✅ CommonJS export
