const emailFooter = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 12px; color: #888888; text-align: center;">
        <p>
            <strong>Kairoz World</strong><br>
            Kota, Rajasthan, 324001<br>
            India
        </p>
        <p>&copy; ${new Date().getFullYear()} Kairoz World. All rights reserved.</p>
    </div>
`;

const emailHeader = `
    <div style="text-align: center; padding-bottom: 20px;">
        <img src="https://res.cloudinary.com/dhn7ljscf/image/upload/v1762791289/Logo1_j3jovz.jpg" alt="Kairoz World Logo" style="max-width: 150px; height: auto;">
    </div>
`;

export const getNewOrderAdminEmail = (order) => {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
            ${emailHeader}
            <h2 style="color: #333333; text-align: center;">🎉 New Order Received!</h2>
            <p style="font-size: 16px;">A new order has been placed in your store:</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee;">
            
            <h3 style="color: #333333;">Order Details:</h3>
            <ul style="list-style-type: none; padding-left: 0; font-size: 15px;">
                <li style="padding: 5px 0;"><strong>Order ID:</strong> ${
                  order._id
                }</li>
                <li style="padding: 5px 0;"><strong>Customer Name:</strong> ${
                  order.shippingAddress.name
                }</li>
                <li style="padding: 5px 0;"><strong>Final Amount:</strong> <b style="color: #16a34a; font-size: 18px;">₹${order.finalAmount.toFixed(
                  2
                )}</b></li>
                <li style="padding: 5px 0;"><strong>Payment Method:</strong> ${
                  order.paymentMethod
                }</li>
                <li style="padding: 5px 0;"><strong>Payment Status:</strong> ${
                  order.paymentStatus
                }</li>
            </ul>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee;">
            <p style="text-align: center; margin-top: 25px;">
                <a href="https://YOUR_ADMIN_PANEL_URL.COM/orders/${
                  order._id
                }" style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                    View Order in Admin Panel
                </a>
            </p>
            ${emailFooter}
        </div>
    `;
};


export const getReturnRequestAdminEmail = (order, reason) => {
  const productListHtml = order.cartItems
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 10px; font-size: 14px;">${
              item.product?.title || "N/A"
            }</td>
            <td style="padding: 10px; font-size: 14px;">${item.quantity}</td>
            <td style="padding: 10px; font-size: 14px;">${item.size} / ${
        item.color
      }</td>
        </tr>
    `
    )
    .join("");

  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
            ${emailHeader}
            <h2 style="color: #dc2626; text-align: center;">⚠️ New Return Request Submitted</h2>
            <p style="font-size: 16px;">A customer has submitted a return request:</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee;">
            
            <h3 style="color: #333333;">Request Details:</h3>
            <ul style="list-style-type: none; padding-left: 0; font-size: 15px;">
                <li style="padding: 5px 0;"><strong>Order ID:</strong> ${
                  order._id
                }</li>
                <li style="padding: 5px 0;"><strong>Customer Name:</strong> ${
                  order.shippingAddress.name
                }</li>
                <li style="padding: 5px 0;"><strong>Order Amount:</strong> ₹${order.finalAmount.toFixed(
                  2
                )}</li>
                <li style="margin-top: 10px;">
                    <strong>Customer's Reason:</strong>
                    <div style="background-color: #f9f9f9; border: 1px solid #eeeeee; padding: 10px; border-radius: 5px; margin-top: 5px; font-style: italic;">
                        ${reason}
                    </div>
                </li>
            </ul>

            <h3 style="color: #333333; margin-top: 20px;">Products in Order:</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background-color: #f3f4f6;">
                    <tr>
                        <th style="padding: 10px;">Product</th>
                        <th style="padding: 10px;">Qty</th>
                        <th style="padding: 10px;">Variant</th>
                    </tr>
                </thead>
                <tbody>
                    ${productListHtml}
                </tbody>
            </table>

            <hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 20px;">
            <p style="text-align: center; margin-top: 25px;">
                <a href="https://YOUR_ADMIN_PANEL_URL.COM/orders/${
                  order._id
                }" style="background-color: #dc2626; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                    Manage Return Request
                </a>
            </p>
            ${emailFooter}
        </div>
    `;
};
