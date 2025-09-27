const express = require("express");
const {
  addPincode,
  getAllPincodes,
  checkPincode,
  deletePincode,
} = require("../controllers/pincodeController");

const router = express.Router();

router.post("/", addPincode);
router.get("/", getAllPincodes);
router.get("/:code", checkPincode);
router.delete("/:code", deletePincode);

module.exports = router; 
