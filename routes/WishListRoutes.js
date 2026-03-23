import express from "express";
import {
  addToWishlist,
  getWishlist,
  updateWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/WishController.js";

const router = express.Router();

// POST - Add item
router.post("/add", addToWishlist);

// GET - Get all wishlist items of user
router.get("/:userId", getWishlist);

// PUT - Update wishlist item (like note, etc.)
router.put("/update/:id", updateWishlist);

// DELETE - Remove single wishlist item
router.delete("/remove/:id", removeFromWishlist);

// DELETE - Clear entire wishlist
router.delete("/clear/:userId", clearWishlist);

export default router;
