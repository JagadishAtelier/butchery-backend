import Pincode from "../Model/Pincode.js";

// ✅ Add new pincode
export const addPincode = async (req, res) => {
  try {
    const { code, area } = req.body;
    const pincode = new Pincode({ code, area });
    await pincode.save();
    res.status(201).json(pincode);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Get all pincodes
export const getAllPincodes = async (req, res) => {
  try {
    const pincodes = await Pincode.find();
    res.json(pincodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Check if a pincode is serviceable
export const checkPincode = async (req, res) => {
  try {
    const { code } = req.params;
    const pincode = await Pincode.findOne({ code });
    if (pincode) {
      res.json({ available: true, area: pincode.area });
    } else {
      res.json({ available: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete a pincode
export const deletePincode = async (req, res) => {
  try {
    await Pincode.findOneAndDelete({ code: req.params.code });
    res.json({ message: "Pincode removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
