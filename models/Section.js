import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    identifier: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    tags: [{ type: String }],
    componentType: {
      type: String,
      enum: [
        "carousel",
        "scrollable",
        "grid",
        "banner",
        "CategoryCirlce",
        "discount",
      ],
      required: true,
    },
    order: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
  },
  { timestamps: true }
);

const Section = mongoose.model("Section", sectionSchema);
export default Section;

