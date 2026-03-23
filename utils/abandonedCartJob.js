// cron/abandonedCartJob.js
import cron from "node-cron";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import { sendAbandonedCartEmail } from "../utils/email/cartMailer.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

export const scheduleAbandonedCartJob = () => {
  // Every day at 11:00 AM IST
  cron.schedule("30 11 * * *", async () => {
    try {
      const since = new Date(Date.now() - ONE_DAY);
      const carts = await Cart.find({
        "items.0": { $exists: true },
        updatedAt: { $lte: since }, // cart not updated in last 24h
        $or: [
          { lastAbandonedEmailAt: { $exists: false } },
          { lastAbandonedEmailAt: { $lte: since } }, // not mailed in last 24h
        ],
      })
        .populate({
          path: "items.product",
          select:
            "title price discountPrice variants.images variants.color category parentCategory thumbnail",
          populate: [{ path: "category", select: "name slug" }],
        })
        .limit(500);

      for (const cart of carts) {
        const user = await User.findById(cart.user).select("name firstName email");
        if (!user?.email) continue;

        const checkoutUrl = `${process.env.FRONTEND_URL}/checkout`;
        const couponHint = process.env.ABANDONED_COUPON || ""; 

        await sendAbandonedCartEmail({
          to: user.email,
          user,
          cart,
          checkoutUrl,
          couponHint,
        });

        cart.lastAbandonedEmailAt = new Date();
        await cart.save();
      }

      console.log(`AbandonedCartJob: mailed ${carts.length} users`);
    } catch (err) {
      console.error("AbandonedCartJob error:", err.message);
    }
  }, { timezone: "Asia/Kolkata" });
};
