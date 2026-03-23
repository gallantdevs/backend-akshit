import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },

   
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    tags: [{ type: String }],

    price: { type: Number, required: true }, // MRP
    discountPrice: { type: Number }, // Selling Price
    gst: { type: Number, default: 0 }, // GST %

    stock: {
      totalQty: { type: Number, default: 0 }, // ✅ Total stock of product
      reservedQty: { type: Number, default: 0 }, // ✅ Reserved for orders not shipped yet
      lowStockThreshold: { type: Number, default: 5 }, // ✅ For alerts
      isInStock: { type: Boolean, default: true }, // ✅ Quick flag
    },

    variants: [
      {
        color: String,
        images: [
          {
            url: String,
            alt: String,
          },
        ],
        sizes: [
          {
            size: String,
            totalQty: { type: Number, default: 0 }, // Total stock of this size
            reservedQty: { type: Number, default: 0 }, // Reserved in cart/orders
          },
        ],
      },
    ],

    offer: {
      discountType: { type: String, enum: ["percent", "flat"], default: null },
      value: { type: Number, default: 0 },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
    },

    coupons: [
      {
        code: { type: String },
        discountType: {
          type: String,
          enum: ["percent", "flat"],
          default: "percent",
        },
        value: { type: Number, required: true },
        minPurchase: { type: Number, default: 0 },
        maxDiscount: { type: Number, default: null },
        expiryDate: { type: Date, default: null },
        isActive: { type: Boolean, default: true },
      },
    ],

    isFeatured: { type: Boolean, default: false },

    // Dynamic category-wise product attributes
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// 🔹 Pre-save hook to update stock status
productSchema.pre("save", function (next) {
  this.stock.isInStock = this.stock.totalQty > this.stock.reservedQty;
  next();
});
// Sparse index for coupons
productSchema.index({ "coupons.code": 1 }, { sparse: true });
productSchema.index({ "stock.isInStock": 1 });
productSchema.index({ "variants.sizes.size": 1 });
// 🔹 Virtual fields for GST calculations
productSchema.virtual("gstDetails").get(function () {
  const sellingPrice = this.discountPrice || this.price || 0;
  const gstPercent = this.gst || 0;

  // Flipkart-style calculation: derive GST from price
  const baseValue = sellingPrice / (1 + gstPercent / 100);
  const gstAmount = sellingPrice - baseValue;

  return {
    gstPercent,
    baseValue: baseValue.toFixed(2), // taxable amount before GST
    gstAmount: gstAmount.toFixed(2), // total GST included
    cgst: (gstAmount / 2).toFixed(2),
    sgst: (gstAmount / 2).toFixed(2),
    totalWithGST: sellingPrice.toFixed(2), // same as selling price
  };
});

productSchema.set("toJSON", { virtuals: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
