import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, index: true },
    otpHash: { type: String, required: true }, 
    purpose: { type: String, default: "login" }, 
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true }, 
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

otpSchema.methods.markUsed = function () {
  this.used = true;
  return this.save();
};

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
