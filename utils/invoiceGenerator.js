
export const generateInvoiceFormat = (order) => {
  const invoiceNo = `INV-${order._id.toString().slice(-6).toUpperCase()}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN");

  let grandSubtotal = 0;
  let totalCGST = 0;
  let totalSGST = 0;

  const rows = order.cartItems
    .map((item, index) => {
      const priceInclGST = item.price;
      const qty = item.quantity;
      const gstPercent = item.product?.gst || 0;

      const basePrice = priceInclGST / (1 + gstPercent / 100);
      const gstAmount = priceInclGST - basePrice;
      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;

      const lineBase = basePrice * qty;
      const lineCGST = cgst * qty;
      const lineSGST = sgst * qty;
      const lineTotal = priceInclGST * qty;

      grandSubtotal += lineBase;
      totalCGST += lineCGST;
      totalSGST += lineSGST;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product?.title || "Product"}</td>
          <td>${qty}</td>
          <td>₹${priceInclGST.toFixed(2)}</td>
          <td>₹${lineTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="5" style="font-size:11px;color:#666;text-align:right">
            (CGST ₹${lineCGST.toFixed(2)} + SGST ₹${lineSGST.toFixed(2)})
          </td>
        </tr>
      `;
    })
    .join("");

  const finalAmount =
    grandSubtotal +
    totalCGST +
    totalSGST +
    (order.shippingCharge || 0) -
    (order.discount || 0);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Invoice</title>
<style>
  body { font-family: Arial, sans-serif; background:#f5f5f5; }
  .invoice-box {
    max-width: 850px;
    margin:auto;
    background:#fff;
    padding:30px;
    border:1px solid #eee;
  }
  .bar { height:8px; background:#ff5a1f; margin-bottom:20px; }
  .header { display:flex; justify-content:space-between; }
  .header h2 { margin:0; }
  .invoice-title { text-align:right; }
  table { width:100%; border-collapse:collapse; margin-top:20px; }
  th { background:#ff5a1f; color:#fff; padding:8px; }
  td { padding:8px; border-bottom:1px solid #ddd; }
  .totals { width:40%; float:right; margin-top:20px; }
  .totals td { padding:6px; }
  .balance {
    background:#e6f4e6;
    font-size:18px;
    font-weight:bold;
  }
  .footer { margin-top:40px; font-size:12px; color:#777; }
</style>
</head>

<body>
<div class="invoice-box">
  <div class="bar"></div>

  <div class="header">
    <div>
      <h2>KAIROZ</h2>
      <p>
        Your Company Address<br/>
        Phone: XXXXXXXX
      </p>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p>
        Date: ${invoiceDate}<br/>
        Invoice No: ${invoiceNo}
      </p>
    </div>
  </div>

  <hr/>

  <table style="margin-top:10px">
    <tr>
      <td>
        <strong>Bill To:</strong><br/>
        ${order.shippingAddress.name}<br/>
        ${order.shippingAddress.address}<br/>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br/>
        📞 ${order.shippingAddress.mobile}
      </td>
      <td>
        <strong>Ship To:</strong><br/>
        Same as billing address
      </td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Subtotal</td>
      <td>₹${grandSubtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td>CGST</td>
      <td>₹${totalCGST.toFixed(2)}</td>
    </tr>
    <tr>
      <td>SGST</td>
      <td>₹${totalSGST.toFixed(2)}</td>
    </tr>
    ${
      order.discount
        ? `<tr><td>Discount</td><td>-₹${order.discount.toFixed(2)}</td></tr>`
        : ""
    }
    ${
      order.shippingCharge
        ? `<tr><td>Shipping</td><td>₹${order.shippingCharge.toFixed(2)}</td></tr>`
        : ""
    }
    <tr class="balance">
      <td>Balance Due</td>
      <td>₹${finalAmount.toFixed(2)}</td>
    </tr>
  </table>

  <div style="clear:both"></div>

  <div class="footer">
    This is a system generated invoice. No signature required.
  </div>

  <div class="bar"></div>
</div>
</body>
</html>
`;
};
