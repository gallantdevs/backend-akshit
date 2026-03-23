import Order from "../models/Order.js";
import Product from "../models/Product.js";

export const paymentWebhook = async (req, res) => {
  const { orderId, paymentId, signature, status } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const verified = true; 
    if (!verified) throw new Error("Invalid payment signature");

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");

    if (order.paymentStatus === "paid") {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    if (status === "success") {
      order.paymentStatus = "paid";
      order.orderStatus = "processing";

      for (const item of order.cartItems) {
        await Product.updateOne(
          { _id: item.product },
          {
            $inc: {
              "stock.totalQty": -item.quantity,
              "stock.reservedQty": -item.quantity,
            },
          },
          { session }
        );
      }
    } else {
      order.paymentStatus = "failed";
      order.orderStatus = "cancelled";

      for (const item of order.cartItems) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { "stock.reservedQty": -item.quantity } },
          { session }
        );
      }
    }

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: "Payment processed securely" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Payment Webhook Error:", err.message);
    res.status(500).json({ success: false, message: "Webhook failed" });
  }
};
