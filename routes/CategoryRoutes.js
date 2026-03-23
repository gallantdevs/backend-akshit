import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
} from "../controllers/CategoryController.js";

const router = express.Router();

// ✅ Get all categories 
router.get("/categories", getCategories);

// ✅ Get category tree
router.get("/categories/tree", getCategoryTree);

// ✅ Get single category by ID
router.get("/categories/:id", getCategoryById);

// ✅ Create new category
router.post("/categories", createCategory);

// ✅ Update category
router.put("/categories/:id", updateCategory);

// ✅ Delete category
router.delete("/categories/:id", deleteCategory);

export default router;
