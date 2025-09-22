const mongoose = require("mongoose");

const shiprocketTokenSchema = new mongoose.Schema({
  token: String,
  expiresAt: Date,
});

module.exports = mongoose.model("ShiprocketToken", shiprocketTokenSchema);
