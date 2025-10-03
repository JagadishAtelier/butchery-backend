const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    images: [{ type: String }], // Product images
    name: { type: String, required: true }, // e.g., Chicken Breast, Mutton Curry Cut
    tamilName : { type : String , required :true},
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    
    productVideoUrl: { type: String },

    description: { type: String }, // Product details
    tamilDescription : {type : String},

    // ✅ Meat-specific attributes
    cutType: [{ type: String }], // e.g., "Curry Cut", "Boneless", "Whole"
    shelfLife: { type: String }, // e.g., "2 days refrigerated", "6 months frozen"
    storageInstructions: { type: String }, // e.g., "Keep refrigerated at 0-4°C"

    unit: { type: String, enum: ["g", "kg", "piece"], default: "kg" },
    weightOptions: [
      {
        weight: { type: Number, required: true }, 
        price: { type: Number, required: true }, 
        discountPrice : {type : Number},
        unit: { type: String, enum: ["g", "kg", "piece"], default: "kg" },
        stock: { type: Number, default: 0 }, 
      },
    ],

    SKU: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Inactive" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
