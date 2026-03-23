import express from "express";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

import { isAdmin } from "../middleware/adminMiddleware.js";


const router = express.Router();

// User routes
router.get("/me", protect, getProfile);
router.put("/update", protect, updateProfile);

// Admin routes
router.get("/all", protect, isAdmin, getAllUsers);
router.delete("/:id", protect, isAdmin, deleteUser);

export default router;
 