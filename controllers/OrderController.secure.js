import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Log from "../models/Log.js";
import { generateInvoiceFormat } from "../utils/invoiceGenerator.js";
import fs from "fs";
import { mapOrderToShiprocketPayload } from "../utils/shiprocketHelper.js";
import { checkServiceability } from "../services/shiprocketService.js";
import {
  createShiprocketOrder,
  assignAWB,
  scheduleShiprocketPickup,
} from "../controllers/shiprocketController.js";
import pdf from "html-pdf";
import Razorpay from "razorpay";
import sendEmail from "../utils/sendEmail.js";
import phantomjs from "phantomjs-prebuilt";

import {
  getNewOrderAdminEmail,
  getReturnRequestAdminEmail,
} from "../utils/emailTemplates.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// aks
const dispatchOrderInternal = async (orderId) => {
  const order = await Order.findById(orderId);

  const srPayload = mapOrderToShiprocketPayload(order);
  const srResponse = await createShiprocketOrder(srPayload);

  console.log("🚀 SR Response:", srResponse);

  order.shiprocketOrderId = srResponse.order_id;

  const awbResponse = await assignAWB(order.shiprocketOrderId);

  console.log("📦 AWB Response:", awbResponse);

  const awb = awbResponse?.response?.awb_code;

  if (!awb) {
    throw new Error("❌ AWB not generated");
  }

  order.awbNumber = awb;

  await order.save();

  console.log("✅ AWB SAVED:", awb);
};

export const getInvoicePDF = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate(
      "cartItems.product",
      "title price brand gst"
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const html = generateInvoiceFormat(order);

    const options = {
      format: "A4",
      phantomPath: phantomjs.path,
    };

    pdf.create(html, options).toStream((err, stream) => {
      if (err) {
        console.error("PDF generation error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to generate PDF" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice_${orderId}.pdf`
      );
      stream.pipe(res);
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }1``
};

/* =====================================================
    🧾 1️⃣ SECURE ORDER CREATION (COMBO-FIXED)
   ===================================================== */
export const createOrderSecure = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { user, cartItems, couponCode, shippingAddress, paymentMethod } =
      req.body;

    // ✅ Basic Validations
    if (!user || !mongoose.Types.ObjectId.isValid(user)) {
      throw new Error("Invalid or missing user ID");
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error(
        "Your cart is empty. Please add products before checkout."
      );
    }
    if (!shippingAddress || typeof shippingAddress !== "object") {
      throw new Error("Shipping address is required");
    }
    for (const f of ["name", "mobile", "address", "city", "state", "pincode"]) {
      if (!shippingAddress[f])
        throw new Error(`Shipping address field '${f}' is required`);
    }
    if (!paymentMethod || !["COD", "Online"].includes(paymentMethod)) {
      throw new Error("Invalid payment method. Use 'COD' or 'Online'");
    }

    // ================== CART VALIDATION & TOTALS ==================
    let totalAmount = 0;
    const validatedCart = [];

    const detectComboKey = (item) => {
      if (item.comboId && item.comboTotalPrice) return `id:${item.comboId}`;
      if (item.comboSlug && item.comboTotalPrice)
        return `slug:${item.comboSlug}`;
      if (item.isCombo && item.comboTotalPrice)
        return `flag:${item.comboSlug || "na"}`;
      return null;
    };

    const comboGroups = {};
    const regularItems = [];

    for (const item of cartItems) {
      const key = detectComboKey(item);
      if (key) {
        if (!comboGroups[key]) {
          comboGroups[key] = {
            items: [],
            comboPrice: Number(item.comboTotalPrice),
            comboSlug: item.comboSlug || null,
          };
        }
        comboGroups[key].items.push(item);
      } else {
        regularItems.push(item);
      }
    }

    // ---------- Process COMBOS ----------
    for (const comboKey in comboGroups) {
      const combo = comboGroups[comboKey];
      const comboPrice = Number(combo.comboPrice);
      const itemCount = combo.items.length;
      if (!itemCount || !Number.isFinite(comboPrice)) {
        throw new Error("Invalid combo data in cart");
      }
      const pricePerItem = comboPrice / itemCount;

      const groupQty = Math.max(
        ...combo.items.map((i) => Number(i.quantity || 1))
      );

      for (const item of combo.items) {
        if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
          throw new Error("Invalid product ID in cart");
        }

        const product = await Product.findById(item.product).session(session);
        if (!product) throw new Error(`Product not found: ${item.product}`);

        const variant = product.variants?.find((v) => v.color === item.color);
        if (!variant)
          throw new Error(
            `Color '${item.color}' not available for ${product.title}`
          );

        const sizeInfo = variant.sizes?.find((s) => s.size === item.size);
        if (!sizeInfo) {
          throw new Error(
            `Size '${item.size}' not available for ${product.title} (${item.color})`
          );
        }

        const availableStock =
          (sizeInfo.totalQty || 0) - (sizeInfo.reservedQty || 0);
        const qty = Number(item.quantity || 1);
        if (availableStock < qty) {
          throw new Error(
            `Only ${availableStock} items available for ${product.title}`
          );
        }

        validatedCart.push({
          product: product._id,
          quantity: qty,
          price: pricePerItem,
          color: item.color,
          size: item.size,
          isCombo: true,
          comboId: comboKey.startsWith("id:") ? comboKey.slice(3) : undefined,
          comboSlug: combo.comboSlug,
        });

        await Product.updateOne(
          { _id: product._id },
          { $inc: { "variants.$[v].sizes.$[s].reservedQty": qty } },
          {
            arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
            session,
          }
        );
        await Product.updateOne(
          { _id: product._id },
          { $inc: { "stock.reservedQty": qty } },
          { session }
        );
      }

      // 👉 Add combo price ONCE per group × groupQty
      totalAmount += comboPrice * groupQty;
    }

    // ---------- Process REGULAR ITEMS ----------
    for (const item of regularItems) {
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        throw new Error("Invalid product ID in cart");
      }

      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);

      const variant = product.variants?.find((v) => v.color === item.color);
      if (!variant)
        throw new Error(
          `Color '${item.color}' not available for ${product.title}`
        );

      const sizeInfo = variant.sizes?.find((s) => s.size === item.size);
      if (!sizeInfo) {
        throw new Error(
          `Size '${item.size}' not available for ${product.title} (${item.color})`
        );
      }

      const availableStock =
        (sizeInfo.totalQty || 0) - (sizeInfo.reservedQty || 0);
      const qty = Number(item.quantity || 1);
      if (availableStock < qty) {
        throw new Error(
          `Only ${availableStock} items available for ${product.title}`
        );
      }

      const actualPrice = product.discountPrice || product.price;
      validatedCart.push({
        product: product._id,
        quantity: qty,
        price: actualPrice,
        color: item.color,
        size: item.size,
        isCombo: false,
      });

      totalAmount += actualPrice * qty;

      await Product.updateOne(
        { _id: product._id },
        { $inc: { "variants.$[v].sizes.$[s].reservedQty": qty } },
        {
          arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
          session,
        }
      );
      await Product.updateOne(
        { _id: product._id },
        { $inc: { "stock.reservedQty": qty } },
        { session }
      );
    }

    // ================== COUPON / FINAL ==================
    let discount = 0;
    let couponApplied = false;
    let couponData = {};

    if (couponCode && couponCode.trim() !== "") {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
      }).session(session);
      if (!coupon) throw new Error("Invalid coupon code");
      if (!coupon.active) throw new Error("This coupon is currently inactive");
      if (coupon.expireAt && coupon.expireAt < new Date()) {
        throw new Error("This coupon has expired");
      }
      if (totalAmount < coupon.minPurchase) {
        throw new Error(`Minimum purchase of ₹${coupon.minPurchase} required`);
      }
      if (coupon.perUserLimit) {
        const usedCount = await Order.countDocuments({
          user,
          couponCode: coupon.code,
        }).session(session);
        if (usedCount >= coupon.perUserLimit) {
          throw new Error(
            `You have already used this coupon ${coupon.perUserLimit} time(s)`
          );
        }
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new Error("This coupon has reached its maximum usage limit");
      }

      if (coupon.discountType === "PERCENT") {
        discount = Math.floor((coupon.discountValue / 100) * totalAmount);
      } else if (coupon.discountType === "FLAT") {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, totalAmount);

      couponApplied = true;
      couponData = {
        couponCode: coupon.code,
        couponDiscountType: coupon.discountType,
        couponDiscountValue: coupon.discountValue,
      };

      await Coupon.updateOne(
        { _id: coupon._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    const finalAmount = Math.max(totalAmount - discount, 0);

    const orderPayload = {
      user,
      cartItems: validatedCart,
      totalAmount,
      discount,
      finalAmount,
      shippingAddress: {
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
      },
      paymentMethod,
      couponApplied,
      ...couponData,
      paymentStatus: paymentMethod === "COD" ? "pending" : "initiated",
    };

    const newOrder = new Order(orderPayload);
    const savedOrder = await newOrder.save({ session });

    // try {
    //   const adminEmail = process.env.ADMIN_EMAIL || "harshsepta49@gmail.com";
    //   const emailHtml = getNewOrderAdminEmail(savedOrder);
    //   await sendEmail({
    //     to: adminEmail,
    //     subject: `🎉 New Order Received! (ID: ${savedOrder._id})`,
    //     html: emailHtml,
    //   });
    // } catch (emailError) {
    //   console.error("❌ Failed to send admin email:", emailError.message);
    // }

    // Aks
    // ✅ Email disabled
    console.log("📧 [EMAIL DISABLED]");
    console.log("Order ID:", savedOrder._id);
    console.log("Order Data:", savedOrder);


    try {
      const io = req.app.get("socketio");
      if (io)
        io.emit("new_order_received", {
          message: `New order received! ID: ${savedOrder._id}`,
          order: savedOrder,
        });
    } catch (socketError) {
      console.error("❌ Socket.io error:", socketError.message);
    }

    await session.commitTransaction();
    // aks
    try {
      await dispatchOrderInternal(savedOrder._id);
    } catch (err) {
      console.error("Dispatch failed:", err);
    }
    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: savedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("💥 Order Creation Failed:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get all orders (admin)
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate(
        "cartItems.product",
        "title price brand variants.images variants.color"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get orders by user
export const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate(
        "cartItems.product",
        "title price brand discountPrice variants.images variants.color"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update order status (Admin)
export const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    // Fetch order with session
    const order = await Order.findById(id)
      .populate("cartItems.product")
      .session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    const oldStatus = order.orderStatus;

    // ✅ CASE 1: Order DELIVERED ho gaya (reservedQty release + totalQty decrease)
    if (orderStatus === "delivered" && oldStatus !== "delivered") {
      console.log(`🚚 Order ${id} is being marked as DELIVERED`);

      for (const item of order.cartItems) {
        // 1. Variant level: reservedQty decrease, totalQty decrease
        const variantResult = await Product.updateOne(
          { _id: item.product._id },
          {
            $inc: {
              "variants.$[v].sizes.$[s].totalQty": -item.quantity,
              "variants.$[v].sizes.$[s].reservedQty": -item.quantity,
            },
          },
          {
            arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
            session,
          }
        );

        if (variantResult.modifiedCount === 0) {
          console.warn(
            `⚠️ Warning: Variant stock not updated for ${item.product._id}`
          );
        }

        // 2. Product level: reservedQty decrease, totalQty decrease
        await Product.updateOne(
          { _id: item.product._id },
          {
            $inc: {
              "stock.totalQty": -item.quantity,
              "stock.reservedQty": -item.quantity,
            },
          },
          { session }
        );

        console.log(
          `✅ Stock reduced: ${item.product.title} (${item.color}/${item.size}) - Qty: ${item.quantity}`
        );
      }

      order.deliveredAt = new Date();
    } else if (
      orderStatus === "cancelled" &&
      oldStatus !== "delivered" &&
      oldStatus !== "cancelled"
    ) {
      console.log(`❌ Order ${id} is being CANCELLED`);

      for (const item of order.cartItems) {
        // 1. Variant level: sirf reservedQty release
        await Product.updateOne(
          { _id: item.product._id },
          {
            $inc: {
              "variants.$[v].sizes.$[s].reservedQty": -item.quantity,
            },
          },
          {
            arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
            session,
          }
        );

        // 2. Product level: sirf reservedQty release
        await Product.updateOne(
          { _id: item.product._id },
          {
            $inc: {
              "stock.reservedQty": -item.quantity,
            },
          },
          { session }
        );

        console.log(
          `✅ Reserved stock released: ${item.product.title} (${item.color}/${item.size})`
        );
      }
    }

    // ✅ CASE 3: Simple status update (processing → shipped, etc.)
    // Update order status
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save({ session });

    await session.commitTransaction();
    console.log(`✅ Order ${id} status updated to: ${orderStatus}`);

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Update order status error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ✅ Delete order (Admin)
export const deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
      order.razorpayPaymentId =
        req.body.razorpayPaymentId || order.razorpayPaymentId;

      if (req.body.paymentStatus === "Paid") {
        order.paidAt = Date.now();
      }

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order not found");
    }
  } catch (error) {
    console.error("Error updating order payment:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const dispatchOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.orderId;

    // 1. Order details with populated product
    const order = await Order.findById(orderId)
      .populate("user", "email")
      .populate("cartItems.product", "title")
      .session(session);

    if (!order) throw new Error("Order not found");

    // --- A. Shiprocket Registration ---
    if (!order.shiprocketOrderId) {
      // Your shiprocket order creation logic
      // const srPayload = mapOrderToShiprocketPayload(order);
      // const srResponse = await createShiprocketOrder(srPayload);
      // order.shiprocketOrderId = srResponse.order_id;
      // await order.save({ session });
    }

    // --- B. AWB Assignment ---
    if (!order.awbNumber) {
      // Your AWB assignment logic
      // order.awbNumber = awbResponse.response.awb_code;
      // await order.save({ session });
    }

    // --- C. Pickup Schedule ---
    // Your pickup scheduling logic

    // --- D. STOCK UPDATE (When shipped, not delivered)
    // ⚠️ Important: This reduces ONLY reserved, NOT total
    // Total stock will be reduced when status changes to "delivered"


// Aks
    if (!order.shiprocketOrderId) {
      const srPayload = mapOrderToShiprocketPayload(order);

      const srResponse = await createShiprocketOrder(srPayload);

      console.log("🚀 Shiprocket order response:", srResponse);

      order.shiprocketOrderId = srResponse.order_id;

      await order.save({ session });
    }

    if (!order.awbNumber) {
      const awbResponse = await assignAWB(order.shiprocketOrderId);

      console.log("📦 AWB Response:", awbResponse);

      order.awbNumber = awbResponse?.response?.awb_code;

      await order.save({ session });
    }





    if (order.orderStatus !== "shipped") {
      console.log(`📦 Dispatching order ${orderId} - Releasing reserved stock`);

      for (const item of order.cartItems) {
        // NO CHANGES TO STOCK HERE
        // Reserved stock will be handled in updateOrderStatus when delivered
        console.log(
          `📦 Item to ship: ${item.product.title} (${item.color}/${item.size}) x${item.quantity}`
        );
      }
    }

    // --- E. Final Update ---
    order.orderStatus = "shipped";
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order successfully dispatched!",
      order: order,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Dispatch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ✅ User initiates a return request (valid within 7 days of delivery)
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId).populate(
      "cartItems.product",
      "title"
    );

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (order.returnRequest?.requested)
      return res
        .status(400)
        .json({ success: false, message: "Return already requested" });

    if (order.orderStatus !== "delivered" || !order.deliveredAt)
      return res.status(400).json({
        success: false,
        message: "Return allowed only after delivery",
      });

    // ✅ Check 7-day return window
    const deliveryDate = order.deliveredAt;
    const today = new Date();
    const diffDays = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      return res
        .status(400)
        .json({ success: false, message: "Return period expired (7 days)" });
    }

    order.returnRequest = {
      requested: true,
      reason,
      status: "pending",
      requestedAt: new Date(),
    };

    await order.save();

    try {
      const adminEmail = "harshsepta49@gmail.com";

      const emailHtml = getReturnRequestAdminEmail(order, reason);

      await sendEmail({
        to: adminEmail,
        subject: `⚠️ New Return Request (Order: ${order._id})`,
        html: emailHtml,
      });

      console.log("Admin return request email sent successfully.");
    } catch (emailError) {
      console.error(
        "Failed to send admin return request email:",
        emailError.message
      );
    }

    res.json({
      success: true,
      message: "Return request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Return request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReturnStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { status, adminNote } = req.body;

    const order = await Order.findById(orderId)
      .populate("cartItems.product")
      .session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (!order.returnRequest?.requested) {
      throw new Error("No return request found");
    }

    order.returnRequest.status = status;
    order.returnRequest.processedAt = new Date();
    if (adminNote) order.returnRequest.adminNote = adminNote;

    if (status === "approved") {
      console.log(`🔄 Return approved for order: ${orderId} - Restoring stock`);

      for (const item of order.cartItems) {
        await Product.updateOne(
          {
            _id: item.product._id,
            "variants.color": item.color,
            "variants.sizes.size": item.size,
          },
          {
            $inc: {
              "variants.$[v].sizes.$[s].totalQty": item.quantity,
            },
          },
          {
            arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
            session,
          }
        );

        await Product.updateOne(
          { _id: item.product._id },
          {
            $inc: { "stock.totalQty": item.quantity },
          },
          { session }
        );

        console.log(
          `✅ Stock restored: ${item.product.title} (${item.color}/${item.size}) +${item.quantity}`
        );
      }

      order.refundAmount = order.finalAmount;
      order.returnRequest.completedAt = new Date();
      order.orderStatus = "cancelled";
    }

    if (status === "rejected") {
      order.returnRequest.completedAt = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();

    res.json({ success: true, message: `Return ${status}`, order });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update return status error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const markReturnReceived = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.returnRequest.status !== "approved")
      return res.status(400).json({ message: "Return not approved yet" });

    order.returnRequest.receivedByAdmin = true;
    order.returnRequest.pickupDone = true;
    order.returnRequest.status = "received";
    order.returnRequest.refundStatus = "processing";

    await order.save();

    res.json({
      success: true,
      message: "Return item received by admin",
      order,
    });
  } catch (error) {
    console.error("markReturnReceived error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (order.returnRequest.refundStatus === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Refund already processed" });
    }

    if (
      order.returnRequest.status !== "received" &&
      order.returnRequest.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Refund allowed only after return is received/approved",
      });
    }

    const refundAmountPaise = Math.round(order.refundAmount * 100);

    let refundResponse;
    if (order.paymentMethod === "Online" && order.razorpayPaymentId) {
      refundResponse = await razorpay.payments.refund(order.razorpayPaymentId, {
        amount: refundAmountPaise,
        speed: "optimum",
        notes: {
          reason: "Product returned",
          order_id: order._id.toString(),
        },
      });
    } else {
      refundResponse = {
        id: "manual_refund_" + Date.now(),
        status: "processed",
        entity: "refund",
      };
    }

    order.returnRequest.refundStatus = "completed";
    order.returnRequest.status = "completed";
    order.returnRequest.completedAt = new Date();
    order.refundTransactionId = refundResponse.id;
    order.orderStatus = "cancelled";

    await order.save();

    res.json({
      success: true,
      message: "Refund processed successfully",
      refund: refundResponse,
      order,
    });
  } catch (error) {
    console.error("processRefund error:", error);

    if (error.error && error.error.description) {
      return res.status(400).json({
        success: false,
        message: error.error.description,
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};
