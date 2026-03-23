import express from "express";
import { upload } from "../middleware/cloudinaryUpload.js"; 
import { uploadImages } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, upload.array("images", 5), uploadImages);

export default router;