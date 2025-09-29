// Model/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },

    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },
    deliveryInstructions: { type: String },

    // extended statuses to support claim/assignment lifecycle
    status: {
      type: String,
      enum: ["pending", "claimed", "Reached Pickup Point", "Picked Up","Delivered", "cancelled"],
      default: "pending",
      lowercase: true
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "Card", "NetBanking", "Wallet"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "Paid", "failed", "refunded"],
      default: "pending",
      lowercase: true
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

    // ----- Claiming fields for real-time assignment -----
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: "PilotUser", default: null },
    claimedAt: { type: Date, default: null },
    claimExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// create 2dsphere index for geo queries
orderSchema.index({ pingLocation: "2dsphere" });
// index for quick lookup of available orders
orderSchema.index({ status: 1, claimExpiresAt: 1 });

/**
 * NOTE on orderId generation:
 * Your previous pre-save logic incremented by checking last order's orderId.
 * That can be a race condition under heavy concurrency.
 * Below I keep similar logic, but for production consider using:
 *  - a separate counters collection (atomic increments)
 *  - or a timestamp-based id: `ORD${Date.now()}`
 */

// 🔹 Auto-generate incremental orderId before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    try {
      // safer: use timestamp to avoid concurrency collisions
      // comment out if you still prefer ORD1, ORD2...
      this.orderId = `ORD${Date.now()}`;

      // If you *must* keep incremental numeric ids, use a counter collection instead.
      // Example (not implemented here): a 'counters' collection with findOneAndUpdate({ _id: 'orderId' }, { $inc: { seq: 1 }}, {new:true, upsert:true})
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

/**
 * Static helper: try to atomically claim an order
 * - orderIdOrId: can be Mongo _id or orderId (string). We'll attempt both.
 * - pilotId: ObjectId or string
 * - claimDurationMs: how long the claim should be valid (e.g. 2 * 60 * 1000)
 *
 * Returns the updated order doc (populated) on success or null on failure.
 */
orderSchema.statics.claimOrder = async function (orderIdOrId, pilotId, claimDurationMs = 2 * 60 * 1000) {
  const ObjectId = mongoose.Types.ObjectId;
  const now = new Date();
  const claimExpiresAt = new Date(now.getTime() + claimDurationMs);

  // Build a query that allows claiming if:
  //  - claimedBy is null (never claimed)
  //  - OR claimExpiresAt is in the past (previous claim expired)
  //  - status is 'pending' (only pending orders can be claimed)
  const queryById = {
    $and: [
      {
        $or: [
          { claimedBy: null },
          { claimExpiresAt: { $lte: new Date() } },
          { claimExpiresAt: null }
        ]
      },
      { status: 'pending' }
    ]
  };

  // try matching by Mongo _id if looks like an ObjectId
  let query = null;
  if (ObjectId.isValid(orderIdOrId)) {
    query = { _id: ObjectId(orderIdOrId), ...queryById };
  } else {
    // fallback to orderId field
    query = { orderId: orderIdOrId, ...queryById };
  }

  const update = {
    $set: {
      claimedBy: ObjectId(pilotId),
      claimedAt: now,
      claimExpiresAt,
      status: 'assigned'
    }
  };

  // atomic update
  const updated = await this.findOneAndUpdate(query, update, { new: true })
    .populate('buyer', 'name email')
    .populate('claimedBy', 'name email')
    .lean();

  return updated; // null if couldn't claim
};

/**
 * Static helper: release a claim if pilot owns it (explicit release)
 */
orderSchema.statics.releaseClaim = async function (orderIdOrId, pilotId) {
  const ObjectId = mongoose.Types.ObjectId;
  const query = ObjectId.isValid(orderIdOrId)
    ? { _id: ObjectId(orderIdOrId), claimedBy: ObjectId(pilotId) }
    : { orderId: orderIdOrId, claimedBy: ObjectId(pilotId) };

  const update = {
    $set: {
      claimedBy: null,
      claimedAt: null,
      claimExpiresAt: null,
      status: 'pending'
    }
  };

  const updated = await this.findOneAndUpdate(query, update, { new: true });
  return updated;
};

module.exports = mongoose.model("Order", orderSchema);
