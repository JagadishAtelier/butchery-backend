const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, 
    tamilName:{type : String , required : true},
    description: String,
    tamilDescription:{type : String},
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
