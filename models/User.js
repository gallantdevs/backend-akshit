// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      sparse: true,
    },


    role: {
      type: String,
      enum: ["user", "admin", "subadmin"],
      default: "user",
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ Profile fields
    avatarUrl: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    dob: { type: Date, default: null },
    whatsappUpdates: { type: Boolean, default: false },

    // ✅ Meta
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
    lastLoginAt: { type: Date },
    isActive: { type: Boolean, default: true },
    loginCount: { type: Number, default: 0 },
    tokenVersion: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);

// Auto-update timestamps
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

userSchema.methods.completeOnboarding = function ({ fullName, email }) {
  if (fullName) this.fullName = fullName;
  if (email) this.email = email;
  this.isVerified = true;
  return this.save();
};

userSchema.statics.findOrCreateByMobile = async function (mobile) {
  let user = await this.findOne({ mobile });
  if (!user) user = await this.create({ mobile });
  return user;
};

userSchema.methods.incrementTokenVersion = async function () {
  this.tokenVersion += 1;
  await this.save();
  return this.tokenVersion;
};


const User = mongoose.model("User", userSchema);
export default User;
