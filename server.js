import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { createServer } from "http";
import { Server } from "socket.io";

import DataBaseConnection from "./config/db.js";
import ProductRouter from "./routes/productRoutes.js";
import CategoryRouter from "./routes/CategoryRoutes.js";
import PosterRouter from "./routes/PosterRoutes.js";
import SectionRouter from "./routes/SectionRoutes.js";
import Section from "./models/Section.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import CartRoute from "./routes/cartRoutes.js";
import ComboRouter from "./routes/comboRoutes.js";
import shiprocketRoutes from "./routes/ShiprocketRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import PaymentRoutes from "./routes/PaymentRoutes.js";
import wishlistRoutes from "./routes/WishListRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { startCleanupCronJob } from "./utils/cleanupService.js";
import { scheduleAbandonedCartJob } from "./utils/abandonedCartJob.js";

const app = express();
dotenv.config();
const allowedOrigins = [
  "http://localhost:5173",
  "https://beyoung-frontend.vercel.app",
];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// Akshit # ahhh
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
startCleanupCronJob();
const seedDefaultSections = async () => {
  try {
    const existingSections = await Section.countDocuments();

    if (existingSections === 0) {
      const defaultSections = [
        {
          name: "Main Carousel",
          identifier: "main-carousel",
          title: "Main Banner",
          tags: ["festival", "Festive-Sale"],
          componentType: "carousel",
          order: 1,
          isActive: true,
        },
        {
          name: "Super Saving Combos",
          identifier: "super-saving-combos",
          title: "SUPER SAVING COMBOS",
          subtitle: "Loved by 4+ millions",
          tags: ["super-saving-combos"],
          componentType: "scrollable",
          order: 2,
          isActive: true,
        },
        {
          name: "Categories",
          identifier: "categories",
          title: "Most Wanted Categories",

          tags: [
            "shirt",
            "shorts",
            "t-shirt",
            "jeans",
            "trouser",
            "cargo-joggers",
            "cargo",
          ],
          componentType: "grid",
          order: 3,
          isActive: true,
        },
        {
          name: "Back to College",
          identifier: "back-to-college",
          title: "Back To College",
          subtitle: "Styles to Slay This Semester!",
          tags: ["back-to-college"],
          componentType: "scrollable",
          order: 4,
          isActive: true,
        },
      ];

      await Section.insertMany(defaultSections);
      console.log("✅ Default sections seeded successfully!");
      console.log(`📋 Created ${defaultSections.length} sections`);

      const categoriesSection = defaultSections.find(
        (s) => s.identifier === "categories"
      );
      console.log("Categories section tags:", categoriesSection.tags);
    } else {
      console.log(`📋 Sections already exist (${existingSections} found)`);

      const categoriesSection = await Section.findOne({
        identifier: "categories",
      });
      if (
        categoriesSection &&
        typeof categoriesSection.tags[0] === "string" &&
        categoriesSection.tags[0].includes(",")
      ) {
        console.log("🔧 Fixing categories section tags...");

        const fixedTags = categoriesSection.tags[0]
          .replace(/"/g, "")
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0);

        await Section.updateOne(
          { identifier: "categories" },
          { $set: { tags: fixedTags } }
        );

        console.log("✅ Categories section tags fixed:", fixedTags);
      }
    }
  } catch (error) {
    console.error("❌ Error seeding sections:", error);
  }
};

const initializeApp = async () => {
  try {
    await DataBaseConnection();
    console.log("🗄️  Database connected successfully");

    await seedDefaultSections();

    const httpServer = createServer(app);

    const io = new Server(httpServer, {
      cors: {
        // origin: allowedOrigins,

        // Akshit # ahhh
        origin: true,
        
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log(`🔌 Naya user connect hua: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`🔌 User disconnect hua: ${socket.id}`);
      });
    });

    app.set("socketio", io);

    httpServer.listen(process.env.PORT, () => {
      console.log(
        `🚀 Server (and Socket.io) is running on port ${process.env.PORT}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    process.exit(1);
  }
};

app.use("/api/product", ProductRouter);
app.use("/api/category", CategoryRouter);
app.use("/api/poster", PosterRouter);
app.use("/api/section", SectionRouter);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", CartRoute);
app.use("/api/combo", ComboRouter);
app.use("/api/shiprocket", shiprocketRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/payment", PaymentRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/upload", uploadRoutes);
scheduleAbandonedCartJob();
initializeApp();
