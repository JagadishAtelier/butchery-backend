import express from "express";
import {
  addPincode,
  getAllPincodes,
  checkPincode,
  deletePincode,
} from "../controllers/pincodeController.js";

const router = express.Router();

router.post("/", addPincode);      // Add new pincode
router.get("/", getAllPincodes);   // Get all pincodes
router.get("/:code", checkPincode); // Check single pincode
router.delete("/:code", deletePincode); // Delete pincode

export default router;
