// import sendEmail from "../sendEmail.js";
// Aks
import sendEmail from "../sendEmailAks.js";
import { buildAddToCartHTML, buildAbandonedCartHTML } from "./cartTemplates.js";

export const sendAddToCartEmail = async ({ to, user, cart, checkoutUrl }) => {
  const html = buildAddToCartHTML({ user, cart, checkoutUrl });
  await sendEmail({
    to,
    subject: "Your cart is loaded with bestsellers ✨",
    message: "Complete your purchase",
    html,
  });
};

export const sendAbandonedCartEmail = async ({ to, user, cart, checkoutUrl, couponHint }) => {
  const html = buildAbandonedCartHTML({ user, cart, checkoutUrl, couponHint });
  await sendEmail({
    to,
    subject: "You left something in your cart 🛒",
    message: "Finish your order",
    html,
  });
};
