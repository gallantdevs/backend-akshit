import express from "express";
import {
  getActiveCoupons,
  createCoupon,
  validateCoupon,
  applyCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import { isSubAdminOrAdmin } from "../middleware/adminMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Routes
router.post("/", protect, isSubAdminOrAdmin, createCoupon);
router.put("/:id", protect, isSubAdminOrAdmin, updateCoupon);
router.delete("/:id", protect, isSubAdminOrAdmin, deleteCoupon);

// User Routes
router.get("/", getActiveCoupons);
router.post("/validate", validateCoupon);
router.post("/apply", applyCoupon);




export default router;
