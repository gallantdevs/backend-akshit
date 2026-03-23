

const currency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const safe = (s) => (s ? String(s) : "");

const itemRow = (item) => {
  const p = item.product || {};
  const v = (p.variants && p.variants[0]) || {};
  const img =
    (v.images && v.images[0]) ||
    p.thumbnail ||
    "https://via.placeholder.com/120?text=Product";
  const color = item.variant?.color ? ` • ${item.variant.color}` : "";
  const size = item.variant?.size ? ` • ${item.variant.size}` : "";

  return `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid #eee;">
      <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
        <tr>
          <td width="120" valign="top" style="padding-right:12px">
            <img src="${img}" alt="${safe(
    p.title
  )}" width="120" height="120" style="border-radius:8px;display:block;object-fit:cover"/>
          </td>
          <td valign="top">
            <div style="font:600 15px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
              ${safe(p.title) || "Product"}
            </div>
            <div style="color:#666;font:400 13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
              Qty: ${item.quantity}${color}${size}
            </div>
            <div style="margin-top:6px;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
              ${currency(
                item.price
              )} <span style="color:#999;font-weight:500;text-decoration:line-through;margin-left:6px">
                ${item.mrp && item.mrp > item.price ? currency(item.mrp) : ""}
              </span>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
};

const totalsBlock = (cart) => `
  <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin-top:6px">
    <tr>
      <td style="color:#444;font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">Subtotal</td>
      <td align="right" style="font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">${currency(
        cart.items.reduce((s, i) => s + i.price * i.quantity, 0)
      )}</td>
    </tr>
    <tr>
      <td style="color:#444;font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">Shipping</td>
      <td align="right" style="font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">${
        cart.shipping === 0
          ? "<span style='color:#22a866'>FREE</span>"
          : currency(cart.shipping || 0)
      }</td>
    </tr>
    ${
      cart.coupon?.discountAmount
        ? `<tr>
             <td style="color:#444;font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">Coupon (${
               cart.coupon.code
             })</td>
             <td align="right" style="color:#22a866;font:600 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">-${currency(
               cart.coupon.discountAmount
             )}</td>
           </tr>`
        : ""
    }
    <tr>
      <td style="padding-top:8px;border-top:1px dashed #e6e6e6;color:#111;font:700 16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">Total</td>
      <td align="right" style="padding-top:8px;border-top:1px dashed #e6e6e6;color:#111;font:700 16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
        ${currency(Math.max(cart.finalAmount || 0, 0))}
      </td>
    </tr>
  </table>
`;

const outer = ({ title, subtitle, ctaUrl, ctaText, bodyHtml }) => `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <title>${safe(title)}</title>
</head>
<body style="margin:0;background:#f6f7fb;padding:24px">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.06)">
          <tr>
            <td style="background:#111;color:#fff;padding:18px 24px">
              <table width="100%" role="presentation">
                <tr>
                  <td valign="middle">
                    <img src="https://res.cloudinary.com/dhn7ljscf/image/upload/v1762791289/Logo1_j3jovz.jpg" alt="Kairoz World" width="120" style="display:block"/>
                  </td>
                  <td align="right" style="font:500 12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;opacity:.9">Your style, delivered.</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 24px 10px 24px">
              <div style="font:800 22px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">${safe(
                title
              )} <span style="font-size:22px">😍</span></div>
              ${
                subtitle
                  ? `<div style="margin-top:6px;color:#555;font:500 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">${safe(
                      subtitle
                    )}</div>`
                  : ""
              }
            </td>
          </tr>

          <tr><td style="padding:0 24px 10px 24px">${bodyHtml}</td></tr>

          <tr>
            <td style="padding:10px 24px 24px 24px">
              <a href="${ctaUrl}" style="display:inline-block;text-decoration:none;background:#111;color:#fff;padding:14px 18px;border-radius:10px;font:700 15px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">${safe(
  ctaText
)}</a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 24px 24px">
              <div style="background:#f3f5f9;border-radius:12px;padding:14px 14px 10px 14px">
                <div style="font:700 14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin-bottom:4px">Pro tip ✨</div>
                <div style="color:#555;font:500 13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
                  ₹1000 se zyada pe <b>FREE shipping</b>. Coupon mile to checkout par apply karna na bhoolen!
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background:#fafbfe;color:#7a7e86;font:500 12px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">
              You're receiving this because you have an active cart at Kairoz World.
              If you didn’t request this, ignore this email.
              <br/>Need help? Reply to this mail.
            </td>
          </tr>
        </table>
        <div style="color:#98a0aa;font:500 12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin-top:10px">
          © ${new Date().getFullYear()} Kairoz World, Kota, Rajasthan
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const buildAddToCartHTML = ({ user, cart, checkoutUrl }) => {
  const body = `
    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin-top:6px">
      ${cart.items.map(itemRow).join("")}
    </table>
    ${totalsBlock(cart)}
  `;
  return outer({
    title: `Your cart is loaded with bestsellers, ${safe(
      user?.firstName || user?.name || "there"
    )}!`,
    subtitle: "Great picks. Ready to make them yours?",
    ctaUrl: checkoutUrl,
    ctaText: "Checkout Now",
    bodyHtml: body,
  });
};

export const buildAbandonedCartHTML = ({
  user,
  cart,
  checkoutUrl,
  couponHint,
}) => {
  const body = `
    <div style="background:#fdf3f1;border:1px solid #ffd5cd;border-radius:12px;padding:12px 14px;color:#8a3a2a;font:600 13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;margin-bottom:10px">
      You’re almost there! ${
        couponHint
          ? `Use code <b>${safe(couponHint)}</b> for extra savings.`
          : "Grab them before they sell out."
      }
    </div>

    <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
      ${cart.items.map(itemRow).join("")}
    </table>

    ${totalsBlock(cart)}
  `;
  return outer({
    title: `You left something behind, ${safe(
      user?.firstName || user?.name || "friend"
    )}…`,
    subtitle: "Complete your order before your favourites go out of stock.",
    ctaUrl: checkoutUrl,
    ctaText: "Resume Checkout",
    bodyHtml: body,
  });
};
