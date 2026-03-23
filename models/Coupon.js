import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true },
  discountType: { type: String, enum: ["FLAT", "PERCENT"], default: "FLAT" },
  discountValue: { type: Number, required: true },
  minPurchase: { type: Number, default: 0 },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  startAt: { type: Date, default: Date.now },
  expireAt: { type: Date },
  active: { type: Boolean, default: true },
  maxUses: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: null },
});

// ✅ Coupon Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
