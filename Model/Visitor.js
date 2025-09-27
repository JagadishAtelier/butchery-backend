const mongoose = require("mongoose");
const visitorSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  visitedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Visitor", visitorSchema);
