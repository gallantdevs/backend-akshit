// This function takes a MongoDB Order object and converts it to Shiprocket's 'create order' payload
// This function takes a MongoDB Order object and converts it to Shiprocket's 'create order' payload
export const mapOrderToShiprocketPayload = (
  order,
  // Note: pickup_location is the Name, not ID. We'll use the Name defined in the SR panel.
  pickupLocationName = process.env.SHIPROCKET_PICKUP_LOCATION_NAME || "Default"
) => {
  // --- State Mapping Utility ---
  // Shiprocket API expects State Codes (e.g., DL for Delhi)
  const stateMap = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    Assam: "AS",
    Bihar: "BR",
    Chhattisgarh: "CG",
    Goa: "GA",
    Gujarat: "GJ",
    Haryana: "HR",
    "Himachal Pradesh": "HP",
    Jharkhand: "JH",
    Karnataka: "KA",
    Kerala: "KL",
    "Madhya Pradesh": "MP", // <-- FIX APPLIED
    Maharashtra: "MH",
    Manipur: "MN",
    Meghalaya: "ML",
    Mizoram: "MZ",
    Nagaland: "NL",
    Odisha: "OR",
    Punjab: "PB",
    Rajasthan: "RJ",
    Sikkim: "SK",
    "Tamil Nadu": "TN",
    Telangana: "TS",
    Tripura: "TR",
    "Uttar Pradesh": "UP",
    Uttarakhand: "UK",
    "West Bengal": "WB",
    Delhi: "DL", // UT
    // Add more if needed
  };

  const shiprocketState =
    stateMap[order.shippingAddress.state] || order.shippingAddress.state;

  // --- Product Mapping ---
  const orderItems = order.cartItems.map((item) => ({
    name: item.product.title || "Product",
    sku: item.product.sku || item.product._id.toString().slice(-6),
    units: item.quantity,
    price: item.price,
    hsn: item.product.hsnCode || "",
  }));

  return {
    order_id: order._id.toString(),
    order_date: new Date(order.createdAt).toISOString().split("T")[0],

    pickup_location: pickupLocationName,

    billing_customer_name: order.shippingAddress.name,
    billing_email: order.user.email || "test@example.com",
    billing_phone: order.shippingAddress.mobile,
    billing_address: order.shippingAddress.address,
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.pincode,
    billing_state: shiprocketState,
    billing_country: "India",

    shipping_customer_name: order.shippingAddress.name,
    shipping_email: order.user.email || "test@example.com",
    shipping_phone: order.shippingAddress.mobile,
    shipping_address: order.shippingAddress.address,
    shipping_city: order.shippingAddress.city,
    shipping_pincode: order.shippingAddress.pincode,
    shipping_state: shiprocketState, // ✅ MAPPED STATE CODE
    shipping_country: "India",

    order_items: orderItems,
    payment_method: order.paymentMethod,

    // Final Price Details
    shipping_charges: order.shippingCharge || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: order.discount,
    sub_total: order.finalAmount, // Shiprocket expects total price including taxes/discounts

    // Package Dimensions (MUST be set, otherwise you get a package error)
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };
};
