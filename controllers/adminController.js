import User from "../models/User.js";

/* ======================================================
   🧩 Utility: Sanitize user data 
   ====================================================== */
const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.__v;
  delete obj.otpVerified;
  delete obj.updatedAt;
  delete obj.createdAt;
  return obj;
};

/* ======================================================
   🛡️ Create or Promote a Subadmin  (Admin Only)
   ====================================================== */
export const createSubAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied! Only Admin can create or promote Subadmins.",
      });
    }

    const { fullName, email, mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    const existing = await User.findOne({ mobile });

    if (existing) {
      if (existing.role === "user") {
        existing.role = "subadmin";
        existing.isVerified = true;
        if (fullName) existing.fullName = fullName;
        if (email) existing.email = email;
        await existing.save();

        return res.status(200).json({
          success: true,
          message: "User promoted to Subadmin successfully.",
          subadmin: sanitizeUser(existing),
        });
      }

      // ⚠️ Already subadmin or admin
      return res.status(400).json({
        success: false,
        message: `User already exists as ${existing.role}.`,
      });
    }

    // ✅ Create brand new subadmin
    const subadmin = await User.create({
      fullName,
      email,
      mobile,
      role: "subadmin",
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "Subadmin created successfully.",
      subadmin: sanitizeUser(subadmin),
    });
  } catch (err) {
    console.error("❌ createSubAdmin error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ======================================================
   👥 Get All Users (Accessible by Admin & Subadmin)
   ====================================================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-__v -otpVerified -updatedAt -createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error("❌ getAllUsers error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
   🧾 Get All Subadmins (Admin Only)
   ====================================================== */
export const getAllSubAdmins = async (req, res) => {
  try {
    // ✅ Only admin can view subadmins
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied! Only Admin can view subadmins.",
      });
    }

    const subadmins = await User.find({ role: "subadmin" })
      .select("-__v -otpVerified -updatedAt -createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: subadmins.length, subadmins });
  } catch (err) {
    console.error("❌ getAllSubAdmins error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
   🚫 Toggle Block / Unblock User (Admin + Subadmin)
   ====================================================== */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ✅ Restrict subadmins from blocking subadmins/admins
    if (req.user.role === "subadmin" && user.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Subadmins can only block or unblock regular users.",
      });
    }

    // ✅ Restrict anyone from blocking Admins
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot block or unblock Admin users.",
      });
    }

    // ✅ Toggle status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive
        ? `${user.role} unblocked successfully.`
        : `${user.role} blocked successfully.`,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("❌ toggleUserStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/* ======================================================
   🧾 Toggle Block / Unblock Subadmin (Admin Only)
   ====================================================== */
export const toggleSubAdminStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied! Only Admin can block/unblock Subadmins.",
      });
    }

    const { id } = req.params;
    const subadmin = await User.findById(id);

    if (!subadmin) {
      return res.status(404).json({
        success: false,
        message: "Subadmin not found.",
      });
    }

    if (subadmin.role !== "subadmin") {
      return res.status(400).json({
        success: false,
        message: "The selected user is not a Subadmin.",
      });
    }

    subadmin.isActive = !subadmin.isActive;
    await subadmin.save();

    res.json({
      success: true,
      message: subadmin.isActive
        ? "Subadmin unblocked successfully."
        : "Subadmin blocked successfully.",
      subadmin: sanitizeUser(subadmin),
    });
  } catch (err) {
    console.error("❌ toggleSubAdminStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
