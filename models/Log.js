import mongoose from "mongoose";
const logSchema = new mongoose.Schema({
  action: String, 
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  payload: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ["success", "failed"], default: "success" },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("Log", logSchema);
