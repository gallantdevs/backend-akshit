import express from "express";
import {
  createOrder,
  verifyPayment,
  getAllPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", getAllPayments);

export default router;
