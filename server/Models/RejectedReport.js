import mongoose from "mongoose";

const rejectedReportSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  mediaUrls: [String],
  spamScore: Number,
  spamReasons: [String],
  rejectedAt: { type: Date, default: Date.now }
});

export default mongoose.model("RejectedReport", rejectedReportSchema);