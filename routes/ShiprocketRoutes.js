import express from "express";
import {
  getServiceability,
  trackAWB,
} from "../controllers/shiprocketController.js";
import { protect } from "../middleware/adminMiddleware.js";

const router = express.Router();

// /api/shiprocket/check/:pincode
router.get("/check/:pincode", getServiceability);
router.get("/track/:awb", protect, trackAWB); 

export default router;
