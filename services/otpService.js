// services/otpService.js
import crypto from "crypto";
import Otp from "../models/Otp.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// OTP hash function (for security)
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// Generate OTP (4 ya 6 digit)
function generateOtp(length = 4) {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0");
}

export async function sendOtp(mobile, purpose = "login") {
  const otp = generateOtp(4); // 4-digit OTP
  const otpHash = hashOtp(otp);

  // Save OTP in DB
  await Otp.create({
    mobile,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
  });

  // In development: print OTP to console (helpful for local testing)
  if (process.env.NODE_ENV === "development") {
    console.log(`🚀 Dev OTP for ${mobile}: ${otp}`);
    return { success: true, message: "OTP generated (dev). Check server logs." };
  }

  // Production: send via Fast2SMS
  return await sendOtpViaFast2SMS(mobile, otp);
}

export async function verifyOtp(mobile, otp) {
  const record = await Otp.findOne({ mobile, used: false }).sort({
    createdAt: -1,
  });

  if (!record) throw new Error("OTP not found or already used");
  if (record.isExpired()) throw new Error("OTP expired");

  // Check attempts
  if (record.attempts >= record.maxAttempts) {
    throw new Error("Max attempts reached");
  }

  // Compare hash
  if (record.otpHash !== hashOtp(otp)) {
    record.attempts += 1;
    await record.save();
    throw new Error("Invalid OTP");
  }

  // Mark OTP used
  await record.markUsed();
  return { success: true };
}

/* ==========================================================
   Fast2SMS integration
   - Use FAST2SMS_API_KEY in .env
   - Optional: FAST2SMS_USE_QUICK_ROUTE=true  (if not DLT-registered; cost may be higher)
   ========================================================== */
async function sendOtpViaFast2SMS(mobile, otp) {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) throw new Error("Missing FAST2SMS_API_KEY in environment");

    // Message text (keep template short for OTP)
    const message = `Your OTP for login is ${otp}. It will expire in 5 minutes.`;

    // If you want to use "quick" route (DLT not registered) set FAST2SMS_USE_QUICK_ROUTE=true
    // NOTE: Quick route may be rate-limited or costlier. Use only until you complete DLT registration.
    const useQuick = process.env.FAST2SMS_USE_QUICK_ROUTE === "true";

    // Fast2SMS new bulkV2 endpoint (recommended)
    // Example: https://www.fast2sms.com/dev/bulkV2?authorization=API_KEY&route=otp&numbers=91xxxxxxxxxx&message=...
    // We'll call GET with params (their docs support GET for bulkV2). If your account needs POST, switch accordingly.
    const url = useQuick``
      ? "https://www.fast2sms.com/dev/bulk"      // quick route (legacy) — may behave differently per account
      : "https://www.fast2sms.com/dev/bulkV2";  // recommended modern endpoint

    const params = {
      authorization: apiKey,
      route: useQuick ? "v3" : "otp", // route param depends on endpoint; for bulkV2 often "otp"
      numbers: mobile,
      // For bulkV2 you can use variables_values — but simple "message" also works:
      message,
      // if using templates with variable substitution, you can provide variables_values
      // variables_values: otp
    };

    // Some Fast2SMS setups expect headers with 'authorization' instead of params.
    // We'll send both: header + params — server will use whichever it supports.
    const response = await axios.get(url, {
      params,
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    // Log response for debugging (avoid sensitive info in prod logs)
    console.log("✅ Fast2SMS response:", response.data);

    // Check response for success — their structure may vary (status/message)
    if (
      response.data &&
      (response.data.return || response.data.message || response.data.type)
    ) {
      // heuristics: treat common success flags as success
      return { success: true, message: "OTP sent via Fast2SMS" };
    }

    // Fallback — if API returned HTTP 200 but body not expected
    return { success: true, message: "OTP request sent (check Fast2SMS dashboard)" };
  } catch (error) {
    console.error("❌ Fast2SMS Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP via Fast2SMS");
  }
}
