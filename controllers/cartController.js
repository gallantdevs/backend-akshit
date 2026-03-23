import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { sendAddToCartEmail } from "../utils/email/cartMailer.js";
import User from "../models/User.js";
/* =====================================================
   🔒 Utility: recalc totals safely
   ===================================================== */
// function calculateCartTotals(cart) {
//   const totalMrp = cart.items.reduce(
//     (sum, item) => sum + (item.mrp || item.price) * item.quantity,
//     0
//   );

//   const totalSellingPrice = cart.items.reduce(
//     (sum, item) => sum + item.price * item.quantity,
//     0
//   );

//   const totalDiscount = totalMrp - totalSellingPrice;
//   const shipping = totalSellingPrice >= 1000 ? 0 : 49;

//   let finalAmount = totalSellingPrice + shipping;
//   if (cart.coupon && cart.coupon.discountAmount) {
//     finalAmount -= cart.coupon.discountAmount;
//   }

//   cart.totalMrp = totalMrp;
//   cart.totalDiscount = totalDiscount;
//   cart.shipping = shipping;
//   cart.finalAmount = Math.max(finalAmount, 0);

//   return cart;
// }

function calculateCartTotals(cart) {
  if (!cart || !Array.isArray(cart.items)) {
    cart.totalMrp = 0;
    cart.totalDiscount = 0;
    cart.shipping = 0;
    cart.finalAmount = 0;
    return cart;
  }

  let subtotal = 0;
  let totalMrp = 0;
  let totalDiscount = 0;

  // 👉 group combos by id/slug; count each combo only once
  const comboGroups = new Map();

  for (const it of cart.items) {
    const qty = Number(it.quantity || 1);

    // Detect combo row (robust): prefer comboId, else slug, else marker fields
    const isCombo =
      it.isCombo === true ||
      (!!it.comboId && !!it.comboTotalPrice) ||
      (!!it.comboSlug && !!it.comboTotalPrice);

    if (isCombo) {
      const key = it.comboId || `slug:${it.comboSlug}`;
      const price = Number(it.comboTotalPrice || 0);

      if (!comboGroups.has(key)) {
        comboGroups.set(key, { qty, price });
      } else {
        // assume same combo added multiple items → qty should be same; keep max
        const g = comboGroups.get(key);
        g.qty = Math.max(g.qty, qty);
      }

      // MRP/discount breakup for visibility 
      totalMrp += Number(it.mrp || it.price || 0) * qty;
      totalDiscount +=
        ((Number(it.mrp || it.price || 0) - Number(it.price || 0)) || 0) * qty;

      continue; 
    }

    const lineMrp = Number(it.mrp || it.price || 0) * qty;
    const lineSell = Number(it.price || 0) * qty;

    totalMrp += lineMrp;
    subtotal += lineSell;
    totalDiscount += (lineMrp - lineSell);
  }

  for (const { qty, price } of comboGroups.values()) {
    subtotal += price * qty;
  }

  const shipping = subtotal >= 1000 ? 0 : 49;

  let finalAmount = subtotal + shipping;
  if (cart.coupon && cart.coupon.discountAmount) {
    finalAmount -= cart.coupon.discountAmount;
  }

  cart.totalMrp = Math.max(totalMrp, 0);
  cart.totalDiscount = Math.max(totalDiscount, 0);
  cart.shipping = shipping;
  cart.finalAmount = Math.max(finalAmount, 0);

  return cart;
}

/* =====================================================
   ✅ Get current user's cart
   ===================================================== */
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select:
        "title price discountPrice variants.images variants.color category parentCategory",
      populate: [
        { path: "category", select: "_id name slug" },
        { path: "parentCategory", select: "_id name slug" },
      ],
    });

    if (cart) {
      cart.items = cart.items.map((item) => {
        const matchedVariant = item.product.variants.find(
          (v) =>
            v.color?.toLowerCase().trim() ===
            item.variant.color.toLowerCase().trim()
        );

        return {
          ...item.toObject(),
          product: {
            ...item.product.toObject(),
            variants: matchedVariant ? [matchedVariant] : [],
          },
        };
      });
    }

    return res.json(
      cart || {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        discount: 0,
        finalAmount: 0,
      }
    );
  } catch (err) {
    console.error("GetCart error:", err);
    return res.status(500).json({ error: "Server error while fetching cart" });
  }
};

/* =====================================================
   ✅ Add item to cart
   ===================================================== */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productId, color, size, quantity = 1 } = req.body;

    // ---------- Basic validations ----------
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId || !color || !size)
      return res
        .status(400)
        .json({ error: "Product, color & size are required" });
    if (!Number.isInteger(quantity) || quantity <= 0)
      return res
        .status(400)
        .json({ error: "Quantity must be a positive integer" });

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .trim();

    const normColor = norm(color);
    const normSize = String(size).trim();

    // ---------- Fetch product ----------
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ error: "Product not found" });

    // ---------- Find variant (supports both ['M'] and [{size:'M'}]) ----------
    const variant = (product.variants || []).find(
      (v) =>
        norm(v.color) === normColor &&
        Array.isArray(v.sizes) &&
        v.sizes.some((s) =>
          typeof s === "object"
            ? String(s.size).trim() === normSize
            : String(s).trim() === normSize
        )
    );

    if (!variant) {
      return res.status(400).json({ error: "Variant not available" });
    }

  
    const totalQty = product?.stock?.totalQty ?? 0;
    const reservedQty = product?.stock?.reservedQty ?? 0;
    const availableQty = Math.max(totalQty - reservedQty, 0);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const existingItem = cart.items.find(
      (i) =>
        i.product.toString() === String(productId) &&
        norm(i.variant?.color) === normColor &&
        String(i.variant?.size).trim() === normSize
    );

    const currentQty = existingItem ? existingItem.quantity : 0;
    const requestedTotal = currentQty + quantity;

    if (requestedTotal > availableQty) {
      return res.status(400).json({
        error: "Not enough stock",
        available: Math.max(availableQty - currentQty, 0),
      });
    }

    // ---------- Line item pricing ----------
    const sellingPrice = product.discountPrice || product.price;
    const originalPrice = product.price;

    if (existingItem) {
      existingItem.quantity = requestedTotal;
      existingItem.price = sellingPrice;
      existingItem.mrp = originalPrice;
      existingItem.discountPrice = product.discountPrice || null;
    } else {
      cart.items.push({
        product: productId,
        variant: { color: color.trim(), size: normSize },
        quantity,
        price: sellingPrice,
        mrp: originalPrice,
        discountPrice: product.discountPrice || null,
      });
    }

    // ---------- Totals & save ----------
    calculateCartTotals(cart);
    await cart.save();

 
    let populated = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select:
        "title price discountPrice variants.images variants.color category parentCategory thumbnail",
      populate: [
        { path: "category", select: "_id name slug" },
        { path: "parentCategory", select: "_id name slug" },
      ],
    });

    if (populated) {
      populated.items = populated.items.map((it) => {
        const prod = it.product?.toObject?.() || it.product;
        const matchedVariant =
          (prod?.variants || []).find(
            (v) => norm(v.color) === norm(it.variant?.color)
          ) || null;

        return {
          ...it.toObject(),
          product: prod
            ? { ...prod, variants: matchedVariant ? [matchedVariant] : [] }
            : it.product,
        };
      });
    }

    // ---------- Fire add-to-cart email (best-effort) ----------
    try {
      const user = await User.findById(userId).select("fullName email").lean();
      if (user?.email) {
        const checkoutUrl = `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/api/checkout`;
        await sendAddToCartEmail({
          to: user.email,
          user,
          cart: populated || cart,
          checkoutUrl,
        });
      }
    } catch (mailErr) {
      console.error("AddToCart email failed:", mailErr.message);
    }

    return res.json({
      success: true,
      message: "Item added to cart",
      cart: populated || cart,
    });
  } catch (err) {
    console.error("AddToCart error:", err);
    return res.status(500).json({
      error: "Server error while adding to cart",
      details: err.message,
    });
  }
};

/* =====================================================
   ✅ Update cart item qty (FIXED)
   ===================================================== */
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!itemId || quantity < 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: [{ path: "category" }, { path: "parentCategory" }],
    });

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ error: "Item not found in cart" }); 


    if (quantity === 0) {
      console.log("🗑️ Quantity 0 → Removing item from cart");
      item.remove();
    } else {
      item.quantity = quantity;
    } 

    const hadCoupon = cart.coupon && cart.coupon.code;
    let oldCouponCode = hadCoupon ? cart.coupon.code : null;
    let oldCouponMinPurchase = hadCoupon ? cart.coupon.minPurchase || 0 : 0;

    if (hadCoupon && oldCouponMinPurchase === 0) {
      const couponFromDB = await Coupon.findOne({ code: oldCouponCode });
      if (couponFromDB) {
        oldCouponMinPurchase = couponFromDB.minPurchase || 0;
        cart.coupon.minPurchase = oldCouponMinPurchase;
      }
    } 

    const totalSellingPrice = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let couponRemoved = false;
    let couponRecalculated = false;

    if (hadCoupon) {
      if (totalSellingPrice < oldCouponMinPurchase) {
        cart.coupon = null;
        couponRemoved = true;
      } else {
        let newDiscount = 0;
        if (cart.coupon.discountType === "PERCENT") {
          newDiscount = Math.floor(
            (cart.coupon.discountValue / 100) * totalSellingPrice
          );
          if (cart.coupon.maxDiscount) {
            newDiscount = Math.min(newDiscount, cart.coupon.maxDiscount);
          }
        } else if (cart.coupon.discountType === "FLAT") {
          newDiscount = Math.min(cart.coupon.discountValue, totalSellingPrice);
        }

        const oldDiscount = cart.coupon.discountAmount || 0;
        if (newDiscount !== oldDiscount) {
          cart.coupon.discountAmount = newDiscount;
          couponRecalculated = true;
        }
      }
    } 

    calculateCartTotals(cart);
    await cart.save();

    console.log(`✅ Cart updated successfully!`);

    return res.json({
      success: true,
      cart,
      couponRemoved,
      couponRecalculated,
      removedCouponCode: couponRemoved ? oldCouponCode : null,
      message: couponRemoved
        ? `Coupon ${oldCouponCode} removed - below minimum purchase`
        : couponRecalculated
        ? "Coupon discount recalculated"
        : "Cart updated successfully",
    });
  } catch (err) {
    console.error("UpdateCartItem error:", err);
    return res.status(500).json({
      error: "Server error while updating cart",
      details: err.message,
    });
  }
};

/* =====================================================
   ✅ Remove item
   ===================================================== */
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: [{ path: "category" }, { path: "parentCategory" }],
    });

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const removedItem = cart.items.id(itemId);
    if (!removedItem)
      return res.status(404).json({ error: "Item not found in cart" });

    cart.items.pull({ _id: itemId });
    const hadCoupon = cart.coupon && cart.coupon.code;
    const oldCouponMinPurchase = hadCoupon ? cart.coupon.minPurchase || 0 : 0;

    const totalSellingPrice = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let couponRemoved = false;

    if (hadCoupon && totalSellingPrice < oldCouponMinPurchase) {
      cart.coupon = null;
      couponRemoved = true;
    }

    calculateCartTotals(cart);
    await cart.save();

    return res.json({
      message: "Item removed",
      cart,
      couponRemoved,
    });
  } catch (err) {
    console.error("RemoveCartItem error:", err);
    return res.status(500).json({ error: "Server error while removing item" });
  }
};

/* =====================================================
   ✅ APPLY COUPON (FIXED - Store minPurchase properly)
   ===================================================== */

export const applyCoupon = async (req, res) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ message: "Unauthorized user" });

    const userId = req.user.id;
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: "Coupon code required" });

    console.log(
      "\n==================== 🧾 APPLY COUPON DEBUG ===================="
    );

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: [{ path: "category" }, { path: "parentCategory" }],
    });

    if (!cart || !cart.items.length) {
      console.log("❌ Cart is empty");
      return res.status(404).json({ message: "Cart is empty" });
    }

    console.log(`👤 User ID: ${userId}`);
    console.log(`🎟️ Coupon Code: ${code}`);

    if (cart.coupon?.code === code.toUpperCase()) {
      console.log("⚠️ Coupon already applied previously");
      return res.status(400).json({ message: "Coupon already applied" });
    }

    const now = new Date();
    const normalize = (str) =>
      typeof str === "string" ? str.toLowerCase().replace(/[\s_-]+/g, "") : "";

    // 🔍 Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
      .populate("categories", "slug name")
      .populate("productIds", "title");

    if (!coupon) {
      console.log("❌ Coupon not found in database");
      return res.status(404).json({ message: "Invalid coupon" });
    }

    console.log("✅ Coupon found in DB:", {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchase: coupon.minPurchase,
      active: coupon.active,
      expireAt: coupon.expireAt,
    });

    // ✅ Basic Validations
    if (!coupon.active)
      return res.status(400).json({ message: "Coupon inactive" });
    if (coupon.expireAt && now > coupon.expireAt)
      return res.status(400).json({ message: "Coupon expired" });

    const cartTotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const couponCats = (coupon.categories || []).map((c) => c._id.toString());
    const couponCatSlugs = (coupon.categories || [])
      .map((c) => normalize(c.slug))
      .filter(Boolean);
    const couponProds = (coupon.productIds || []).map((p) => p._id.toString());

    console.log("\n🎟️ Coupon Applied To:");
    console.log("   Category IDs:", couponCats);
    console.log("   Category Slugs:", couponCatSlugs);
    console.log("   Product IDs:", couponProds);

    console.log("\n🛒 Cart Items Summary:");
    cart.items.forEach((item, idx) => {
      const catId =
        item.product?.category?._id?.toString() ||
        item.product?.category?.toString();
      console.log(`   #${idx + 1} Product: ${item.product?.title}`);
      console.log(`      Product ID: ${item.product?._id}`);
      console.log(`      Category ID: ${catId}`);
      console.log(`      Category Slug: ${item.product?.category?.slug}`);
      console.log(`      Price: ₹${item.price} × ${item.quantity}`);
    });

    const applicableItems = cart.items.filter((item) => {
      const product = item.product;
      if (!product) return false;

      const productCategoryId =
        product.category?._id?.toString() || product.category?.toString();

      const matchByCategory =
        couponCats.length === 0 ||
        couponCats.includes(productCategoryId) ||
        couponCatSlugs.includes(normalize(product.category?.slug));

      const matchByProduct =
        couponProds.length === 0 ||
        couponProds.includes(product._id?.toString());

      const matched = matchByCategory && matchByProduct;

      console.log(
        `🔎 Checking ${product.title} → Category match: ${matchByCategory}, Product match: ${matchByProduct}, ✅ Final: ${matched}`
      );

      return matched;
    });

    if (!applicableItems.length) {
      console.log("❌ No items in cart match the coupon criteria");
      console.log(
        "==============================================================="
      );
      return res.status(400).json({
        success: false,
        message: "This coupon is not applicable to any items in your cart.",
      });
    }

    console.log(
      `✅ ${applicableItems.length} matching items found for coupon.`
    );

    let applicableTotal = applicableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    console.log(`💰 Applicable Total: ₹${applicableTotal}`);

    let discountAmount = 0;
    if (coupon.discountType === "PERCENT") {
      discountAmount = Math.floor(
        (coupon.discountValue / 100) * applicableTotal
      );
    } else if (coupon.discountType === "FLAT") {
      discountAmount = Math.min(coupon.discountValue, applicableTotal);
    }

    console.log(`💸 Discount Calculated: ₹${discountAmount}`);

    // ✅ Update cart coupon
    cart.coupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      minPurchase: coupon.minPurchase || 0,
    };

    calculateCartTotals(cart);
    await cart.save();

    console.log("✅ Coupon applied successfully!");
    console.log("🧾 Final Cart Amount:", cart.finalAmount);
    console.log(
      "===============================================================\n"
    );

    return res.json({
      success: true,
      message: `Coupon "${coupon.code}" applied successfully!`,
      discountAmount,
      finalAmount: cart.finalAmount,
      applicableItemsCount: applicableItems.length,
      cart,
    });
  } catch (err) {
    console.error("❌ ApplyCoupon error:", err);
    console.log(
      "===============================================================\n"
    );
    return res.status(500).json({
      success: false,
      message: "Server error while applying coupon",
      details: err.message,
    });
  }
};

/* =====================================================
   ✅ Remove Coupon from Cart
   ===================================================== */
export const removeCoupon = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (!cart.coupon) {
      return res.status(400).json({ error: "No coupon applied to cart" });
    }

    const removedDiscount = cart.coupon.discountAmount || 0;

    cart.coupon = null;

    calculateCartTotals(cart);

    await cart.save();

    return res.json({
      success: true,
      message: "Coupon removed successfully",
      removedDiscount,
      cart,
    });
  } catch (err) {
    console.error("RemoveCoupon error:", err);
    return res.status(500).json({
      error: "Server error while removing coupon",
      details: err.message,
    });
  }
};


/* =====================================================
   ✅ Clear Cart 
   ===================================================== */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;


    await Cart.findOneAndUpdate(
      { user: userId },
      {
        items: [],
        coupon: null,
        totalMrp: 0,
        totalDiscount: 0,
        shipping: 0,
        finalAmount: 0,
        totalItems: 0,
        totalPrice: 0,
        discount: 0,
      },
      { new: true }
    );

    return res.json({ message: "Cart cleared successfully" });
  } catch (err) {
    console.error("ClearCart error:", err);
    return res.status(500).json({ error: "Server error while clearing cart" });
  }
};

/* =====================================================
   ✅ Add Combo
   ===================================================== */

export const addCombo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { comboSlug, comboItems, comboPrice, quantity = 1 } = req.body;

    if (
      !comboSlug ||
      !comboItems ||
      !Array.isArray(comboItems) ||
      comboItems.length === 0
    ) {
      return res.status(400).json({ error: "Invalid combo data" });
    }

    const invalidItem = comboItems.find(
      (item) => !item.productId || !item.color || !item.size
    );
    if (invalidItem) {
      return res.status(400).json({
        error: "All combo items must have productId, color, and size",
      });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const comboId = `combo_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const pricePerItem = comboPrice / comboItems.length;

    for (const item of comboItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product ${item.productId} not found` });
      }

      const productMrp = product.price || product.mrp || pricePerItem;

      cart.items.push({
        product: item.productId,
        variant: { color: item.color, size: item.size },
        quantity: quantity,
        price: pricePerItem,
        mrp: productMrp,
        discountPrice: pricePerItem,
        isCombo: true,
        comboId: comboId,
        comboSlug: comboSlug,
        comboTotalPrice: comboPrice,
        comboItemCount: comboItems.length,
      });
    }

    calculateCartTotals(cart);
    await cart.save();

    return res.json({
      message: "Combo added to cart successfully",
      cart,
      success: true,
    });
  } catch (err) {
    console.error("AddCombo error:", err);
    return res.status(500).json({
      error: "Server error while adding combo",
    });
  }
};
