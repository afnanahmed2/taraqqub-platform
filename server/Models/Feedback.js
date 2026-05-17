import mongoose from "mongoose";

// ============================================================
// 🤖 AI ENHANCED FEEDBACK SCHEMA - NEW FIELDS ADDED
// ============================================================

const feedbackSchema = new mongoose.Schema({
  // ========== البيانات الأساسية (موجودة سابقاً) ==========
  username:     { type: String, required: true },
  email:        { type: String, required: true },
  rating:       { type: Number, required: true, min: 1, max: 5 },
  message:      { type: String, required: true },
  createdAt:    { type: Date, default: Date.now },
  
  // ========== 🆕 معلومات إضافية من المتصفح (جديدة) ==========
  platform:     { type: String, default: '' },      // نظام التشغيل
  language:     { type: String, default: '' },      // لغة المتصفح
  userAgent:    { type: String, default: '' },      // متصفح المستخدم
  categoryHint: { type: String, default: 'general' }, // تلميح أولي للتصنيف
  
  // ========== 🆕 🤖 AI Analysis Data (جديد بالكامل) ==========
  aiAnalysis: {
    sentiment:     { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    urgency:       { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    category:      { type: String, default: 'general' },
    toxicity:      { type: Number, min: 0, max: 100, default: 0 },
    summary:       { type: String, default: '' },
    priorityScore: { type: Number, min: 0, max: 100, default: 50 },
    recommendedAction: { type: String, default: '' },
    isSpam:        { type: Boolean, default: false },
    spamReason:    { type: String, default: '' },
    keywords:      [{ type: String }],
  },
  
  // ========== 🆕 إحصائيات إضافية (جديد) ==========
  analyzedAt:    { type: Date, default: null }
});

// ========== 🆕 إضافة فهارس للبحث السريع (جديد) ==========
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ 'aiAnalysis.sentiment': 1 });
feedbackSchema.index({ 'aiAnalysis.urgency': 1 });
feedbackSchema.index({ 'aiAnalysis.category': 1 });

export default mongoose.model("Feedback", feedbackSchema);