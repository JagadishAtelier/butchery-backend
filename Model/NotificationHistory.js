const mongoose = require("mongoose");

const notificationHistorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationHistory", notificationHistorySchema);
