import Coupon from "../models/Coupon.js";
import Category from "../models/Category.js"; 

// Helper function
function calculateDiscount(coupon, cartTotal) {
  if (coupon.discountType === "PERCENT") {
    return Math.floor((coupon.discountValue / 100) * cartTotal);
  }
  return Math.min(coupon.discountValue, cartTotal);
}

/* ============================================================
   ✅ CREATE COUPON (Admin Panel or Postman)
   Prevent "combos" category coupons
============================================================ */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      categories,
      productIds,
      startAt,
      expireAt,
      active,
      maxUses,
      perUserLimit,
    } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and discount value are required!",
      });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists!",
      });
    }

    // 🚫 Prevent coupon creation for "combos" category
    if (categories && categories.length > 0) {
      const comboCategory = await Category.findOne({ slug: "combos" });
      if (
        comboCategory &&
        categories.some(
          (id) => id.toString() === comboCategory._id.toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Coupons cannot be created for 'combos' category.",
        });
      }
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType: discountType?.toUpperCase() || "FLAT",
      discountValue,
      minPurchase: minPurchase || 0,
      categories: categories || [],
      productIds: productIds || [],
      startAt: startAt || new Date(),
      expireAt: expireAt || null,
      active: active ?? true,
      maxUses: maxUses || null,
      perUserLimit: perUserLimit || null,
    });

    await coupon.save();

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully!",
      coupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating coupon.",
    });
  }
};

/* ============================================================
   ✅ VALIDATE COUPON (for checkout preview)
============================================================ */
export const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, userId, cartProducts, cartCategories } = req.body;

    if (!code)
      return res
        .status(400)
        .json({ success: false, message: "Coupon code is required!" });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
      .populate("categories", "_id name slug")
      .populate("productIds", "_id title");

    if (!coupon)
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code!" });

    const hasComboCategory = coupon.categories.some(
      (c) => c.slug?.toLowerCase() === "combos"
    );
    if (hasComboCategory) {
      return res.status(400).json({
        success: false,
        message: "Coupons cannot be applied to 'combos' category.",
      });
    }

    if (!coupon.active)
      return res
        .status(400)
        .json({ success: false, message: "This coupon is inactive!" });

    const now = new Date();
    if (coupon.startAt && coupon.startAt > now)
      return res
        .status(400)
        .json({ success: false, message: "This coupon is not yet active!" });

    if (coupon.expireAt && coupon.expireAt < now)
      return res
        .status(400)
        .json({ success: false, message: "This coupon has expired!" });

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
      return res
        .status(400)
        .json({ success: false, message: "Coupon usage limit reached!" });

    if (coupon.minPurchase && cartTotal < coupon.minPurchase)
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minPurchase} required.`,
      });

    if (coupon.categories?.length > 0) {
      const couponCatIds = coupon.categories.map((c) => c._id.toString());
      const eligible = cartCategories.some((catId) =>
        couponCatIds.includes(catId.toString())
      );

      if (!eligible) {
        const catNames = coupon.categories.map((c) => c.name || c.slug);
        return res.status(400).json({
          success: false,
          message: `This coupon is valid only for categories: ${catNames.join(
            ", "
          )}.`,
        });
      }
    }

    if (coupon.productIds?.length > 0) {
      const couponProdIds = coupon.productIds.map((p) => p._id.toString());
      const eligibleProduct = cartProducts.some((id) =>
        couponProdIds.includes(id.toString())
      );

      if (!eligibleProduct)
        return res.status(400).json({
          success: false,
          message: "This coupon is valid only for specific products!",
        });
    }

    const discount = calculateDiscount(coupon, cartTotal);

    return res.status(200).json({
      success: true,
      message: `Coupon applied successfully! You saved ₹${discount}.`,
      discountAmount: discount,
      coupon: {
        code: coupon.code,
        type: coupon.discountType,
        value: coupon.discountValue,
        minPurchase: coupon.minPurchase,
        expireAt: coupon.expireAt,
      },
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while validating coupon.",
    });
  }
};

/* ============================================================
   ✅ APPLY COUPON (final usage when order placed)
============================================================ */
export const applyCoupon = async (req, res) => {
  try {
    let { code, cartItems = [], cartTotal, userId } = req.body;

    if (!code)
      return res.status(400).json({
        success: false,
        message: "Coupon code required!",
      });

    code = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ code })
      .populate("categories", "_id name slug")
      .populate("productIds", "_id title");

    if (!coupon)
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code!" });

    const hasComboCategory = coupon.categories.some(
      (c) => c.slug?.toLowerCase() === "combos"
    );
    if (hasComboCategory) {
      return res.status(400).json({
        success: false,
        message: "Coupons cannot be applied to 'combos' category.",
      });
    }

    if (!coupon.active)
      return res
        .status(400)
        .json({ success: false, message: "This coupon is inactive." });

    const now = new Date();
    if (coupon.startAt && now < coupon.startAt)
      return res
        .status(400)
        .json({ success: false, message: "This coupon is not active yet." });

    if (coupon.expireAt && now > coupon.expireAt)
      return res
        .status(400)
        .json({ success: false, message: "This coupon has expired." });

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
      return res
        .status(400)
        .json({ success: false, message: "Coupon usage limit reached." });

    if (cartTotal < (coupon.minPurchase || 0))
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minPurchase} required.`,
      });

    const couponCatIds = (coupon.categories || []).map((c) => c._id.toString());
    const couponCatSlugs = (coupon.categories || [])
      .map((c) => c.slug?.toLowerCase?.())
      .filter(Boolean);
    const couponProdIds = (coupon.productIds || []).map((p) => p._id.toString());

    const eligibleItems = cartItems.filter((item) => {
      const productId = item._id?.toString?.();
      const productCatId = item.category?._id?.toString?.();
      const productCatSlug = item.category?.slug?.toLowerCase?.() || "";

      const matchByCategory =
        couponCatIds.length === 0 ||
        couponCatIds.includes(productCatId) ||
        couponCatSlugs.includes(productCatSlug);

      const matchByProduct =
        couponProdIds.length === 0 ||
        (productId && couponProdIds.includes(productId));

      return matchByCategory && matchByProduct;
    });

    if (eligibleItems.length === 0)
      return res.status(400).json({
        success: false,
        message: "This coupon is not applicable to items in your cart.",
      });

    const eligibleTotal = eligibleItems.reduce(
      (sum, i) => sum + (i.price * i.quantity || 0),
      0
    );

    let discount = 0;
    if (coupon.discountType === "FLAT") {
      discount = Math.min(coupon.discountValue, eligibleTotal);
    } else if (coupon.discountType === "PERCENT") {
      discount = (eligibleTotal * coupon.discountValue) / 100;
    }

    discount = Math.min(discount, eligibleTotal);
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully! You saved ₹${discount}.`,
      discountAmount: discount,
      eligibleItemsCount: eligibleItems.length,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchase: coupon.minPurchase,
      },
    });
  } catch (error) {
    console.error("❌ Coupon Apply Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while applying coupon.",
      details: error.message,
    });
  }
};

/* ============================================================
   ✅ GET ACTIVE / UPDATE / DELETE (unchanged)
============================================================ */
export const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      active: true,
      $or: [{ expireAt: { $gte: new Date() } }, { expireAt: null }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch coupons.",
    });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully!",
      coupon,
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating coupon.",
    });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully!",
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting coupon.",
    });
  }
};
