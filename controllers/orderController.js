import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js"; 
import {
    createShiprocketOrder,
    assignAWB,
    scheduleShiprocketPickup,
} from "../controllers/shiprocketController.js";
import { mapOrderToShiprocketPayload } from "../utils/shiprocketHelper.js";
import { checkServiceability } from "../services/shiprocketService.js";
import pdf from "html-pdf";

/**
 * ✅ Generate Invoice PDF on demand (no file saving)
 * GET /api/orders/invoice/:orderId
 */
export const getInvoicePDF = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate(
      "cartItems.product",
      "title price brand gst "
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 🧾 Dynamic Invoice HTML Template
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
            .summary { margin-top: 20px; font-size: 16px; }
            .total { font-weight: bold; font-size: 18px; color: #16a34a; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <p><strong>Date:</strong> ${new Date(
            order.createdAt
          ).toLocaleDateString()}</p>

          <h3>Billing To:</h3>
          <p>
            ${order.shippingAddress.name}<br/>
            ${order.shippingAddress.address}, ${order.shippingAddress.city}<br/>
            ${order.shippingAddress.state} - ${
      order.shippingAddress.pincode
    }<br/>
            📞 ${order.shippingAddress.mobile}
          </p>

          <h3>Order Details:</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Price</th>
                <th>GST (%)</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
          ${order.cartItems
            .map((item) => {
              const gstPercent = item.product?.gst || 0;
              const price = item.price; 
              const qty = item.quantity;

              const baseValue = price / (1 + gstPercent / 100);
              const gstAmount = price - baseValue;
              const cgst = gstAmount / 2;
              const sgst = gstAmount / 2;

              const totalAmount = price * qty; 

              return `
      <tr>
        <td>${item.product?.title || "N/A"}</td>
        <td>${item.product?.brand || "-"}</td>
        <td>₹${price.toFixed(2)}</td>
        <td>${gstPercent}%</td>
        <td>${qty}</td>
        <td>₹${totalAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="6" style="font-size: 12px; color: gray; text-align:right;">
          (Incl. CGST ₹${(cgst * qty).toFixed(2)} + SGST ₹${(
                sgst * qty
              ).toFixed(2)})
        </td>
      </tr>
    `;
            })
            .join("")}


            </tbody>
          </table>

         
     

<div class="summary">
  <p>Subtotal: ₹${order.totalAmount.toFixed(2)}</p>
  <p>Shipping: ₹${order.shippingCharge || 0}</p>
  ${
    order.discount && order.discount > 0
      ? `<p>Coupon Discount: -₹${order.discount.toFixed(2)}</p>`
      : ""
  }
  <p class="total">Final Amount: ₹${order.finalAmount.toFixed(2)}</p>
</div>



          <p>Payment Method: <strong>${order.paymentMethod}</strong></p>
          <p>Payment Status: <strong>${order.paymentStatus}</strong></p>

          <hr/>
          <p style="font-size: 12px; color: #6b7280;">This is a system-generated invoice. No signature required.</p>
        </body>
      </html>
    `;

    pdf.create(html).toStream((err, stream) => {
      if (err) {
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
  }
};

/* =====================================================
   🧪 2️⃣ BASIC ORDER CREATION (For Testing)
   ===================================================== */
export const createOrder = async (req, res) => {
  try {
    const {
      user,
      cartItems,
      totalAmount,
      couponCode,
      shippingAddress,
      paymentMethod,
    } = req.body;

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required to create order." });
    }
    if (!cartItems || cartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty!" });
    }

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "shippingAddress is required." });
    }

    const requiredAddressFields = ["name", "mobile", "address", "city", "state", "pincode"];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field] || String(shippingAddress[field]).trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `shippingAddress.${field} is required for buy now flow`,
        });
      }
    }

    if (!paymentMethod || !["COD", "Online"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "paymentMethod is required and must be either 'COD' or 'Online'.",
      });
    }

    let verifiedTotal = 0;
    const verifiedItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      const actualPrice = product.discountPrice || product.price;
      verifiedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: actualPrice,
      });
      verifiedTotal += actualPrice * item.quantity;
    }

    let discount = 0;
    let couponApplied = false;
    let couponData = {};

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!coupon || !coupon.active)
        return res.status(400).json({ message: "Invalid or inactive coupon." });

      const now = new Date();
      if (coupon.expireAt && coupon.expireAt < now)
        return res.status(400).json({ message: "Coupon has expired!" });

      if (verifiedTotal < coupon.minPurchase)
        return res.status(400).json({
          message: `Minimum purchase ₹${coupon.minPurchase} required.`,
        });

      discount =
        coupon.discountType === "PERCENT"
          ? Math.floor((coupon.discountValue / 100) * verifiedTotal)
          : coupon.discountValue;

      couponApplied = true;
      couponData = {
        couponCode: coupon.code,
        couponDiscountType: coupon.discountType,
        couponDiscountValue: coupon.discountValue,
      };

      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save();
    }

    const finalAmount = verifiedTotal - discount;

    const newOrder = new Order({
      user,
      cartItems: verifiedItems,
      totalAmount: verifiedTotal,
      discount,
      finalAmount,
      shippingAddress,
      paymentMethod,
      couponApplied,
      ...couponData,
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error creating order." });
  }
};

// ✅ Get All Orders (Admin)
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "fullName email mobile role")
      .populate("cartItems.product", "title brand price variants")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get Orders by User ID
export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId })
      .populate("cartItems.product", "title price variants")
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this user." });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders." });
  }
};

// ✅ Update Order Status (Admin or system)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus, paymentStatus },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully!",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete Order (Admin)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found." });

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    try {
        const orderId = req.params.orderId;
        
        // 1. Fetch Order with necessary details
        const order = await Order.findById(orderId)
            .populate("user", "email") 
            .populate("cartItems.product", "title sku hsnCode"); 
        if (!order) return res.status(404).json({ message: "Order not found" });

        // --- A. Register Order on Shiprocket ---
        if (!order.shiprocketOrderId) {
            const srPayload = mapOrderToShiprocketPayload(order);
            const srResponse = await createShiprocketOrder(srPayload);
            
            if (srResponse.status_code !== 200) {
                 return res.status(400).json({ message: "Shiprocket Registration Failed", details: srResponse });
            }

            order.shiprocketOrderId = srResponse.order_id;
            order.shiprocketShipmentId = srResponse.shipment_id;
            await order.save();
        }

        // --- B. Select Courier & Assign AWB ---
        if (!order.awbNumber) {
            
            // 💡 Courier Selection (Simplest way for development)
            const service = await checkServiceability({ 
                pickup_postcode: process.env.SHIPROCKET_PICKUP_PINCODE, // Get from .env
                delivery_postcode: order.shippingAddress.pincode 
            });

            // Find the best/first available courier
            const bestCourier = service.data.available_couriers[0]; 
            if (!bestCourier) {
                return res.status(400).json({ message: "No couriers available for this location." });
            }

            const awbResponse = await assignAWB(order.shiprocketShipmentId, bestCourier.courier_company_id);
            
            if (awbResponse.status_code !== 200) {
                 return res.status(400).json({ message: "AWB Assignment Failed", details: awbResponse });
            }

            order.awbNumber = awbResponse.response.awb_code;
            order.courierId = bestCourier.courier_company_id;
            await order.save();
        }


        // --- C. Schedule Pickup ---
        const pickupResponse = await scheduleShiprocketPickup(order.shiprocketShipmentId);

        if (pickupResponse.status_code !== 200) {
             return res.status(400).json({ message: "Pickup Scheduling Failed", details: pickupResponse });
        }
        
        // --- D. Final Update ---
        order.orderStatus = "shipped"; 
        await order.save();

        res.status(200).json({
            success: true,
            message: "Order successfully dispatched and pickup scheduled!",
            order: order,
            tracking: { awb: order.awbNumber, courier: order.courierId }
        });

    } catch (error) {
        console.error("Dispatch Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};