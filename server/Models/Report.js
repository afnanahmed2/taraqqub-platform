import mongoose from "mongoose";

/* -------------------- REPORT SCHEMA -------------------- */
const reportSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: true,
      trim:     true,
    },

    category: {
      type:     String,
      required: true,
      enum: [
        "Road Damage",
        "Flooding/Drainage",
        "Blocked Drain",
        "Street Lighting",
        "Traffic Signal",
        "Waste Management",
        "Public Facility Damage",
        "Other",
      ],
    },

    description: {
      type:     String,
      required: true,
    },

    location: {
      type:     String,
      required: true,
    },

    governorate: {
      type:     String,
      required: true,
      enum: [
        "Muscat", "Dhofar", "Al Batinah North", "Al Batinah South",
        "Al Sharqiyah North", "Al Sharqiyah South", "Al Dakhiliyah",
        "Al Dhahirah", "Al Wusta", "Musandam", "Al Buraimi",
      ],
    },

    // ✅ FIX 1: إزالة default من داخل تعريف الحقول الفرعية
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    media: {
      type:    [String],
      default: [],
    },

    priority: {
      type:    String,
      enum:    ["Low", "Medium", "High"],
      default: "Medium",
    },

    recommendation: {
      type:    String,
      default: "Under Review",
    },

    recommendationType: {
      type:    String,
      default: null,
    },

    recommendationAction: {
      type:    String,
      default: null,
    },

    responsibleAuthority: {
      type:    String,
      default: null,
    },

    shortUserMessage: {
      type:    String,
      default: null,
    },

    adminRecommendation: {
      type:    String,
      default: null,
    },

    // ***Update Neeeew*** إضافة New و PendingReview إلى قيم الحالة المسموحة
    status: {
      type:    String,
      enum:    ["pending", "in-progress", "resolved", "spam", "rejected"],
      default: "pending",
    },

    assignedAuthority: {
      type:    String,
      default: "General Authority",
    },

    weatherCondition: {
      type: String,
    },

    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    /* ── حقول تصحيح التصنيف ─────────────────────────────────── */

    categoryCorrected: {
      type:    Boolean,
      default: false,
    },

    // ***Update Neeeew*** إضافة null إلى enum لحل مشكلة التحقق
    originalCategory: {
      type: String,
      enum: [
        "Road Damage", "Flooding/Drainage", "Blocked Drain",
        "Street Lighting", "Traffic Signal", "Waste Management",
        "Public Facility Damage", "Other",
      ],
      default: null,
    },

    correctionReason: {
      type:    String,
      default: null,
    },

    forcedCorrection: {
      type:    Boolean,
      default: false,
    },

    aiConfidence: {
      type:    Number,
      min:     0,
      max:     100,
      default: null,
    },

    aiAnalysis: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ***Update Neeeew*** إضافة حقل درجة السبام وسبب الرفض (إن وجد)
    spamScore: {
      type:    Number,
      min:     0,
      max:     100,
      default: 0,
    },

    spamReasons: {
      type:    [String],
      default: [],
    },
  },
  { timestamps: true }
);

/* -------------------- EXPORT MODEL -------------------- */
export default mongoose.model("Report", reportSchema);