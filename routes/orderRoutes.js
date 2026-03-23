import express from "express";
import { createOrder } from "../controllers/orderController.js";

import {
  createOrderSecure,
  getOrders,
  getOrdersByUser,
  updateOrderStatus,
  deleteOrder,
  updateOrderPaymentStatus,
  getInvoicePDF,
  dispatchOrder,
  requestReturn,
  updateReturnStatus,
  markReturnReceived,
  processRefund,
} from "../controllers/OrderController.secure.js";

import { protect, isSubAdminOrAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();
// const isProduction = process.env.NODE_ENV === "production";

// 2. 🆕 Use 'protect'
router.post("/", protect, createOrderSecure);

// 3. 🆕 Use 'protect' and 'isAdmin'
router.get("/", protect, isSubAdminOrAdmin, getOrders);

// 4. 🆕 Use 'protect'
router.get("/user/:userId", protect, getOrdersByUser);

// 5. 🆕 Use 'protect'
router.put("/:id/payment", protect, updateOrderPaymentStatus);

// 6. 🆕 Use 'protect' and 'isAdmin'
router.put("/:id", protect, isSubAdminOrAdmin, updateOrderStatus);

// 🚀 7. SHIPROCKET DISPATCH ROUTE ADDED

router.post("/:orderId/dispatch", protect, isSubAdminOrAdmin, dispatchOrder);

router.delete("/:id", protect, isSubAdminOrAdmin, deleteOrder);
router.get("/invoice/:orderId", getInvoicePDF);

router.post("/:orderId/return", protect, requestReturn);
router.put("/:orderId/return-status", protect, isSubAdminOrAdmin, updateReturnStatus);

// 🆕 Return Received
router.put("/:orderId/return-receive", protect, isSubAdminOrAdmin, markReturnReceived);

// 🆕 Refund Processing
router.put("/:orderId/refund", protect, isSubAdminOrAdmin, processRefund);

export default router;
