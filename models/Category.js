import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },

  categoryType: { type: String, enum: ["main", "subcategory"], required: true },

  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },

  // ✅ SEO specific content
  seoContent: {
    title: { type: String },
    description: { type: String },
    content: { type: String }, 
    keywords: [{ type: String }],
  },

  seoTable: [
    {
      productTitle: { type: String },
      price: { type: Number },
    },
  ],

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
