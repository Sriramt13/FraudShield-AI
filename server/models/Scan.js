import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true },
  category: String,
  risk_score: Number,
  confidence_percent: Number,
  risk_breakdown: Object,
  security_analysis: Object,
  scannedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Scan", ScanSchema);