import mongoose from "mongoose";

const tipSchema = new mongoose.Schema({
  type: {
    type: String, // rain, wind, sun, danger
    required: true
  },
  content: {
    type: String,
    required: true
  },
  governorate: {
    type: String, // "All" or specific governorate
    default: "All"
  }
}, { timestamps: true });

export default mongoose.model("Tip", tipSchema);