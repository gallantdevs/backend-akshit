import express from "express";
import {
  sendOtpController,
  verifyOtpController,
  completeOnboardingController,
} from "../controllers/authController.js";

const router = express.Router();

// Routes
router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/complete-onboarding", completeOnboardingController);

export default router;
