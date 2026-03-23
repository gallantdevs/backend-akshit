import express from "express";
import {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  getActiveSections
} from "../controllers/SectionController.js";

const router = express.Router();

router.get("/sections", getSections);
router.get("/sections/active", getActiveSections);
router.post("/sections", createSection);
router.put("/sections/:id", updateSection);
router.delete("/sections/:id", deleteSection); 

export default router;