import mongoose from "mongoose";

const comboOfferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  comboPrice: { type: Number, required: true },
  minSelection: { type: Number, required: true, default: 4 },
  maxSelection: { type: Number, required: true, default: 4 },
  isActive: { type: Boolean, default: true },
  thumbnailImage: { type: String, default: "" }, 
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ComboOffer = mongoose.model("ComboOffer", comboOfferSchema);
export default ComboOffer;
