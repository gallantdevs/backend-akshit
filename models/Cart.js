import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    color: { type: String },
    size: { type: String },
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  mrp: { type: Number },
  discountPrice: { type: Number, default: null },

  // ✅ ======= COMBO FIELDS =======
  isCombo: {
    type: Boolean,
    default: false,
  },
  comboId: {
    type: String,
    default: null,
  },
  comboSlug: {
    type: String, 
    default: null,
  },
  comboTotalPrice: {
    type: Number, 
    default: null,
  },
  comboItemCount: {
    type: Number,
    default: null,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],

    totalMrp: { type: Number, default: 0 }, 
    totalDiscount: { type: Number, default: 0 }, 
    shipping: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },

    coupon: {
      code: String,
      discountType: String,
      discountValue: Number,
      discountAmount: Number,
    },
    lastAbandonedEmailAt: { type: Date },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
