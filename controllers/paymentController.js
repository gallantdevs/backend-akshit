import { instance } from "../config/razorpay.js";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
import Order from "../models/Order.js"

export const createOrder = async (req, res) => {
  try {
    const options = {
      amount: Number(req.body.amount * 100),
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(500).send("Some error occurred");
    }

    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send(error.message);
  }
};

// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       amount,
//     } = req.body;

//     const generated_signature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated_signature === razorpay_signature) {
//       console.log("Payment is successful and verified.");

//       await Payment.create({
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         amount: Number(amount),
//         status: "verified",
//       });

//       res.json({
//         success: true,
//         message: "Payment verified and saved successfully",
//       });
//     } else {
//       console.warn("Payment verification failed.");

//       await Payment.create({
//         razorpay_order_id,
//         razorpay_payment_id,
//         amount: Number(amount),
//         status: "failed",
//       });

//       res.status(400).send("Payment verification failed");
//     }
//   } catch (error) {
//     console.error("Error verifying payment:", error);
//     res.status(500).send(error.message);
//   }
// };


// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       amount,
//       orderId,
//     } = req.body;
// console.log("🔹 Payment Verification Data:", req.body);

//     const generated_signature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated_signature === razorpay_signature) {
//       console.log("✅ Payment is successful and verified.");

//       // ✅ 1. Save payment details
//       await Payment.create({
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         amount: Number(amount),
//         status: "verified",
//       });

//       // ✅ 2. Update related order
//       const order = await Order.findById(orderId);
//       if (order) {
//         order.paymentStatus = "Paid";
//         order.paymentMethod = "Online";
//         order.orderStatus = "processing";
//         order.paidAt = new Date();
//         await order.save();
//         console.log("🟢 Order updated after payment verification");
//       } else {
//         console.warn("⚠️ Order not found while updating payment");
//       }

//       res.json({
//         success: true,
//         message: "Payment verified and order updated successfully",
//       });
//     } else {
//       console.warn("❌ Payment verification failed.");

//       await Payment.create({
//         razorpay_order_id,
//         razorpay_payment_id,
//         amount: Number(amount),
//         status: "failed",
//       });

//       res.status(400).send("Payment verification failed");
//     }
//   } catch (error) {
//     console.error("Error verifying payment:", error);
//     res.status(500).send(error.message);
//   }
// };

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      orderId,
    } = req.body;
    console.log("🔹 Payment Verification Data:", req.body);

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log("✅ Payment is successful and verified.");

      await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: Number(amount),
        status: "verified",
      });

      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "Paid";
        order.paymentMethod = "Online";
        order.orderStatus = "processing";
        order.paidAt = new Date();
        
        order.razorpayPaymentId = razorpay_payment_id; 
        
        await order.save();
        console.log("🟢 Order updated after payment verification");
      } else {
        console.warn("⚠️ Order not found while updating payment. Mongoose ID:", orderId);
      }

      res.json({
        success: true,
        message: "Payment verified and order updated successfully",
        razorpayPaymentId: razorpay_payment_id,
      });
    } else {
      console.warn("❌ Payment verification failed.");

      await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        amount: Number(amount),
        status: "failed",
      });

    
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "failed";
        await order.save();
       
      }

      res.status(400).send("Payment verification failed");
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).send(error.message);
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "verified" }).sort({
      createdAt: -1,
    });
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).send(error.message);
  }
};
