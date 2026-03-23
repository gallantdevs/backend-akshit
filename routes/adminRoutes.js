import express from "express";
import {
  createSubAdmin,
  getAllUsers,
  getAllSubAdmins,
  toggleUserStatus,
  toggleSubAdminStatus,
} from "../controllers/adminController.js";
import { protect, isAdmin, isSubAdminOrAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/create-subadmin", protect, isAdmin, createSubAdmin);
router.get("/subadmins", protect, isAdmin, getAllSubAdmins);
router.put("/toggle-subadmin/:id", protect, isAdmin, toggleSubAdminStatus);

router.get("/users", protect, isSubAdminOrAdmin, getAllUsers);
router.put("/toggle-user/:id", protect, isSubAdminOrAdmin, toggleUserStatus);

export default router;
