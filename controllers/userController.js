import User from "../models/User.js";

// ✅ GET Profile (/me)
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ UPDATE Profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, gender, dob, whatsappUpdates } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;
    if (typeof whatsappUpdates === "boolean") user.whatsappUpdates = whatsappUpdates;

    await user.save();

    res.json({ success: true, message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ ADMIN: Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v -otpVerified");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ ADMIN: Delete User
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
