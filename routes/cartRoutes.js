import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyCoupon,
  removeCoupon, 
  clearCart,
  addCombo,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";
import * as couponController from "../controllers/couponController.js";


const router = express.Router();

router.get("/", protect, getCart);
router.post("/add", protect, addToCart);
router.put("/item/:itemId", protect, updateCartItem);
router.delete("/remove/:itemId", protect, removeCartItem);
router.post("/apply-coupon", protect, applyCoupon);
router.post("/remove-coupon", protect, removeCoupon); 
router.delete("/clear", protect, clearCart);
router.post("/add-combo", protect, addCombo);
router.delete("/coupon/:id", couponController.deleteCoupon);

export default router;
