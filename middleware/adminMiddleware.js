import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =============================================
   ✅ 1. PROTECT — Verify JWT & attach user
   ============================================= */

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized, token missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

/* =============================================
   ✅ 2. isAdmin — Allow only main admin
   ============================================= */
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied! Admin only.",
    });
  }
  next();
};

/* =============================================
   ✅ 3. isSubAdminOrAdmin — Allow admin + subadmin
   ============================================= */
export const isSubAdminOrAdmin = (req, res, next) => {
  const role = req.user.role;

  if (role === "admin" || role === "subadmin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied! Admin or Subadmin only.",
  });
};
