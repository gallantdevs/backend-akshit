
import cron from "node-cron";
import Order from "../models/Order.js";
import Product from "../models/Product.js";


const cleanupInitiatedOrders = async () => {
  console.log("Running cleanup job for initiated orders...");

  try {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

    const oldOrders = await Order.find({
      paymentStatus: "initiated",
      createdAt: { $lt: twentyMinutesAgo },
    });

    if (oldOrders.length === 0) {
      console.log("No old initiated orders found to clean up.");
      return;
    }

    console.log(`Found ${oldOrders.length} orders to clean up.`);

    for (const order of oldOrders) {

      for (const item of order.cartItems) {
        try {
          await Product.updateOne(
            {
              _id: item.product,
            },
            {
              $inc: {
                "variants.$[v].sizes.$[s].reservedQty": -item.quantity,
              },
            },
            {
              arrayFilters: [
                { "v.color": item.color },
                { "s.size": item.size },
              ],
            }
          );

          await Product.updateOne(
            { _id: item.product },
            {
              $inc: { "stock.reservedQty": -item.quantity },
            }
          );

        } catch (stockError) {
          console.error(
            `Failed to release stock for product ${item.product} in order ${order._id}:`,
            stockError.message
          );
          continue;
        }
      }


      order.paymentStatus = "failed";
      order.orderStatus = "cancelled";
      await order.save();

      console.log(`Cleaned up Order ID: ${order._id}. Stock released.`);
    }

  } catch (error) {
    console.error("Error during order cleanup cron job:", error.message);
  }
};


export const startCleanupCronJob = () => {
  cron.schedule("*/20 * * * *", () => {
    cleanupInitiatedOrders();
  });

  console.log("🔄 Order cleanup cron job scheduled. Will run every 20 minutes.");
};