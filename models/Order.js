import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        color: { type: String, required: true },
        size: { type: String, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    couponApplied: { type: Boolean, default: false },
    couponCode: { type: String, default: null },
    couponDiscountType: {
      type: String,
      enum: ["FLAT", "PERCENT"],
      default: null,
    },
    couponDiscountValue: { type: Number, default: 0 },
    shippingAddress: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ["COD", "Online"], default: "COD" },

    paymentStatus: {
      type: String,
      enum: ["pending", "initiated", "Paid", "failed"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },

    razorpayPaymentId: {
      type: String,
    },

    paidAt: {
      type: Date,
    },
    shiprocketOrderId: { type: String, default: null },
    shiprocketShipmentId: { type: String, default: null },

    awbNumber: { type: String, default: null },
    courierId: { type: Number, default: null },

    returnRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "received", "refunded", "completed"],
        default: "pending",
      },
      requestedAt: { type: Date },
      processedAt: { type: Date },
      completedAt: { type: Date },
      adminNote: { type: String, default: null },

      // 🆕 Additional for production
      pickupDone: { type: Boolean, default: false },  
      receivedByAdmin: { type: Boolean, default: false },
      refundStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
    },
    refundAmount: { type: Number, default: 0 },
    refundTransactionId: { type: String, default: null }, 
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

orderSchema.index({ user: 1 });
orderSchema.index({ couponCode: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
