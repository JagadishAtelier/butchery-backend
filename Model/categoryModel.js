const mongoose = require("mongoose");

// Category Schema
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g., Chicken, Mutton, Fish
    tamilName:{type : String , required : true},
    description: String,
    tamilDescription:{type : String},
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
