import express from "express";


import { upload } from "../middleware/cloudinaryUpload.js";

import {
  createPoster,
  getPoster,
  updatePoster,
  deletePoster,
} from "../controllers/posterController.js";

import { isSubAdminOrAdmin } from "../middleware/adminMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  isSubAdminOrAdmin,
  upload.single("image"),
  createPoster
);
router.put(
  "/:id",
  protect,
  isSubAdminOrAdmin,
  upload.single("image"),
  updatePoster
);
router.delete("/:id", protect, isSubAdminOrAdmin, deletePoster);

router.get("/", getPoster);

export default router;