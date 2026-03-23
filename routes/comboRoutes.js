import express from "express";
import {
  createCombo,
  getCombos,
  getComboBySlug,
  updateCombo,
  deleteCombo
} from "../controllers/comboController.js";

import { upload } from "../middleware/cloudinaryUpload.js"; 
import { protect, isSubAdminOrAdmin } from "../middleware/adminMiddleware.js"; 

const router = express.Router();

// Public Routes
router.get("/", getCombos);
router.get("/:slug", getComboBySlug);


router.post("/", protect, isSubAdminOrAdmin, upload.single("thumbnailImage"), createCombo);
router.put("/:id", protect, isSubAdminOrAdmin, upload.single("thumbnailImage"), updateCombo);  
router.delete("/:id", protect, isSubAdminOrAdmin, deleteCombo);

export default router;