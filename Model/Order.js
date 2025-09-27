const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },

    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },
    deliveryInstructions: { type: String },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Cancelled"],
      default: "Pending",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "Card", "NetBanking", "Wallet"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentDate: Date,

    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        weight: { type: Number },
        price: { type: Number },
        quantity: { type: Number, default: 1 },
      },
    ],

    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },

    // --- Ping location (GeoJSON Point) + timestamp
    // NOTE: GeoJSON coordinate order is [longitude, latitude]
    pingLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined, // keep undefined unless provided
      },
    },
    pingedAt: { type: Date }, // when the ping was recorded
  },
  { timestamps: true }
);

// create 2dsphere index for geo queries
orderSchema.index({ pingLocation: "2dsphere" });

// 🔹 Auto-generate incremental orderId before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    try {
      // Find the last order sorted by creation date descending
      const lastOrder = await this.constructor.findOne().sort({ createdAt: -1 });

      if (lastOrder && lastOrder.orderId) {
        // Extract the numeric part and increment
        const lastNumber = parseInt(lastOrder.orderId.replace("ORD", "")) || 0;
        this.orderId = `ORD${lastNumber + 1}`;
      } else {
        // First order
        this.orderId = "ORD1";
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Order", orderSchema);
