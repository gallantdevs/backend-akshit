import express from "express";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";

import { isSubAdminOrAdmin } from "../middleware/adminMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🟢 Create Product → Only logged-in SubAdmin/Admin
router.post("/products", protect, isSubAdminOrAdmin, createProduct);

// 🟢 Get All Products → Public access
router.get("/products", getProducts);

// 🟡 Update Product → Only logged-in SubAdmin/Admin
router.put("/products/:id", protect, isSubAdminOrAdmin, updateProduct);

// 🔴 Delete Product → Only logged-in SubAdmin/Admin
router.delete("/products/:id", protect, isSubAdminOrAdmin, deleteProduct);

export default router;
