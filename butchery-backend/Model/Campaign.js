const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Weekend Chicken Bonanza"
    
    status: {
      type: String,
      enum: ["Active", "Paused", "Completed"],
      default: "Active",
    },

    // ✅ Budgeting
    budget: { type: Number, required: true },
    spent: { type: Number, default: 0 },

    // ✅ Performance metrics
    ctr: { type: Number, default: 0 }, // Click-through rate
    conversions: { type: Number, default: 0 }, // Orders placed from campaign

    // ✅ Duration
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // ✅ Platforms used for promotion
    platforms: [
      { type: String, enum: ["Google Ads", "Facebook", "Instagram", "YouTube", "Email", "SMS"] },
    ],

    // ✅ Target
    targetType: {
      type: String,
      enum: ["Product", "Category", "SiteWide"],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId }, // Product._id or Category._id

    // ✅ Discount details
    discountType: { type: String, enum: ["Flat", "Percentage"], required: true },
    discountValue: { type: Number, required: true }, // e.g., 100 (₹100 off) or 10 (10%)

    // ✅ Customer targeting
    audience: {
      type: String,
      enum: ["All", "New Customers", "Returning Customers"],
      default: "All",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);
