import mongoose from 'mongoose';

const posterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  tag: { type: String }, 
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null }, 
  redirectUrl: { type: String }, 
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" }, 
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Poster = mongoose.model("Poster", posterSchema);
export default Poster;
