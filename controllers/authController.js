import User from "../models/User.js";
import { sendOtp, verifyOtp } from "../services/otpService.js";
import { generateToken } from "../utils/generateToken.js";

// 1️⃣ Send OTP
export const sendOtpController = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });
    }

    
    const user = await User.findOrCreateByMobile(mobile);

   
    await sendOtp(mobile, "login");

    res.json({
      success: true,
      message: "OTP sent successfully",
      userExists: user.isVerified, 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2️⃣ Verify OTP
export const verifyOtpController = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    await verifyOtp(mobile, otp);

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.lastLoginAt = new Date();
    user.loginCount += 1;
    user.otpVerified = true;

    // 🔑 Important — Invalidate old sessions
    await user.incrementTokenVersion();

    await user.save();

    const token = generateToken(user);

    if (!user.isVerified) {
      return res.json({
        success: true,
        needOnboarding: true,
        message: "OTP verified. Please complete onboarding (name/email).",
        token,
        user,
      });
    }

    res.json({
      success: true,
      needOnboarding: false,
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// 3️⃣ Complete Onboarding (first-time only)
export const completeOnboardingController = async (req, res) => {
  try {
    const { mobile, fullName, email } = req.body;
    if (!mobile || !fullName || !email) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }


    if (!user.otpVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP not verified. Cannot complete onboarding.",
      });
    }


    await user.completeOnboarding({ fullName, email });

 
    return res.json({
      success: true,
      message: "Onboarding complete. User verified.",
      token: generateToken(user._id),
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
