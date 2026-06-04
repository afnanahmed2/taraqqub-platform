/* =========================================================
   📌 IMPORTS & CONFIG
========================================================= */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import User from "./Models/User.js";
import Report from "./Models/Report.js";
import {
  analyzeReport,
  detectSpam,
  combineAIWithSpam,
  generateUserRecommendation,
  generateShortUserMessage,
} from "./AI/aiAnalyzer.js";
import { smartRouteReport } from "./AI/smartRouting.js";
import tipRoutes from "./routes/tipRoutes.js";
import Tip from "./Models/Tips.js";
import Feedback from "./Models/Feedback.js";
// ***Update Neeeew*** إضافة نموذج البلاغات المرفوضة (RejectedReport) لتخزين السبام العالي
import RejectedReport from "./Models/RejectedReport.js";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import fetch from "node-fetch";

/* =========================================================
   ☁️ CLOUDINARY CONFIG
========================================================= */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/* =========================================================
   🚀 APP SETUP
========================================================= */

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// التعديل هنا: جعل الـ origin يقبل الرابط المحلي ورابط الـ Render معاً
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://taraqqub-client.onrender.com',
    'https://taraqqub-platform.onrender.com'
  ], 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use("/api/tips", tipRoutes);

/* =========================================================
   📁 FILE SYSTEM SETUP
========================================================= */

["uploads"].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* =========================================================
   📦 MULTER CONFIG
========================================================= */

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* =========================================================
   🔐 AUTH MIDDLEWARE
========================================================= */

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user   = decoded;
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Not an admin" });
    }
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* =========================================================
   🗄️ DATABASE CONNECTION
========================================================= */

const connectString = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@taraqqubdb.aq0opo9.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose
  .connect(connectString)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

/* =========================================================
   🧪 TEST ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({ message: "🚀 Taraqqub Server Running" });
});

app.get("/login", (req, res) => {
  res.json({ message: "Login API ready" });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy", timestamp: new Date().toISOString() });
});

/* =========================================================
   💬 FEEDBACK APIs
========================================================= */
// ============================================================
// 1️⃣ POST - Submit new feedback with AI analysis 🆕
// 🆕 تم تعديل هذه الدالة لإضافة التحليل التلقائي لكل فيدباك
// ============================================================

app.post("/api/feedback", async (req, res) => {
  try {
    const { username, email, rating, message, platform, language, userAgent, categoryHint } = req.body;

    if (!username || !email || !rating || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: username, email, rating, message",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // 🆕 🤖 AI Analysis - تحليل تلقائي لكل فيدباك (جديد)
    const aiResult = await analyzeSingleFeedback(message, rating, username, email);
   
    // 🆕 إنشاء الفيدباك مع التحليل (تم إضافة الحقول الجديدة)
    const feedback = await Feedback.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      rating: Number(rating),
      message: message.trim(),
      platform: platform || '',           // 🆕 جديد
      language: language || '',           // 🆕 جديد
      userAgent: userAgent || '',         // 🆕 جديد
      categoryHint: categoryHint || 'general', // 🆕 جديد
      aiAnalysis: {                       // 🆕 جديد بالكامل
        sentiment: aiResult.sentiment,
        urgency: aiResult.urgency,
        category: aiResult.category,
        toxicity: aiResult.toxicity,
        summary: aiResult.summary,
        priorityScore: aiResult.priorityScore,
        recommendedAction: aiResult.recommendedAction,
        isSpam: aiResult.isSpam,
        spamReason: aiResult.spamReason,
        keywords: aiResult.keywords,
      },
      analyzedAt: new Date()              // 🆕 جديد
    });

    console.log(`📊 New feedback analyzed: ${aiResult.sentiment}, ${aiResult.urgency}, score: ${aiResult.priorityScore}`);

    res.status(200).json({
      success: true,
      feedback,
      aiAnalysis: aiResult,               // 🆕 إرسال التحليل للمستخدم
      message: "Feedback submitted and analyzed successfully"
    });
  } catch (err) {
    console.error("❌ Error saving feedback:", err);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
});

/* =========================================================
   👤 AUTH APIs
========================================================= */

app.post("/registerUser", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, email, password: hashed, role: "citizen", phone });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔴 حماية: إذا حاول الأدمن الدخول من هنا، السيرفر يرفضه ليوجهه المتصفح لصفحة الأدمن
    if (user.role === "admin") {
      return res.status(403).json({ message: "Please use the Admin login page." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Wrong password" });

    const role = email.endsWith("@taraqqub.om") ? "authority" : "citizen";
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      role,
      token,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone || "", role, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//expres method to handle http post request and authintication user logout
app.post("/logout", async(req,res) =>{ 
  res.status(200).send({msg: "logout successful"});
})

/* =========================================================
   👑 ADMIN LOGIN
========================================================= */

app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. البحث عن الحساب في قاعدة البيانات فقط
    console.log("Admin Login Attempt for:", email);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({ success: false, message: "🚨 الحساب غير موجود في قاعدة البيانات أصلاً" });
    }
    // 2. إذا لم يوجد الحساب، أو وجد ولكن رتبته ليست admin في المونجو -> نرفضه فوراً بـ 403
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin account not authorized." });
    }

    // 3. التحقق من صحة كلمة المرور
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Wrong password" });

    // 4. إنشاء التوكن وإرسال البيانات كاملة
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.json({ 
      success: true, 
      token, 
      user: { _id: user._id, name: user.name, email: user.email, role: user.role } 
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   📊 REPORT APIs — Helpers
========================================================= */

function getAuthorityForCategory(category) {
  const authorityMap = {
    "Road Damage":            "Ministry of Transport",
    "Flooding/Drainage":      "Municipality",
    "Blocked Drain":          "Municipality",
    "Street Lighting":        "Municipality",
    "Traffic Signal":         "Royal Oman Police (ROP)",
    "Waste Management":       "Municipality",
    "Public Facility Damage": "Ministry of Awqaf",
    "Other":                  "General Authority",
  };
  return authorityMap[category] || "General Authority";
}

function generateFallbackRecommendation(aiResult) {
  if (!aiResult) return "🔍 Manual review required: System analysis unavailable";
  const { category, priority, confidence } = aiResult;
  if (priority === "High" && confidence > 70) return "🚨 URGENT: High priority issue detected. Immediate action recommended.";
  if (confidence < 50) return "🔍 Manual review needed: Low confidence analysis. Please verify details.";
  return `🏢 Route to ${getAuthorityForCategory(category)} for standard processing.`;
}

/* =========================================================
   📝 CREATE REPORT (المعدل بالكامل مع تحليل الصور الدائم)
========================================================= */

app.post("/createReport", authenticate, upload.array("media", 5), async (req, res) => {
  try {
    console.log("📥 BODY:", req.body);
    console.log("📂 FILES:", req.files);

    const { title, category, description, location, governorate, coordinates, lat, lng } = req.body;
    let mediaUrls = [];

    // رفع الملفات إلى Cloudinary
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploading ${req.files.length} images to Cloudinary...`);
      const results = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder:        `reports/${req.userId}`,
            resource_type: "auto",
          })
        )
      );
      mediaUrls = results.map((r) => cloudinary.url(r.public_id, { sign_url: true }));
      req.files.forEach((file) => fs.unlinkSync(file.path));
      console.log(`✅ Uploaded ${mediaUrls.length} images`);
    }

    console.log(`[REPORT CREATED] ${title} by ${req.userId}`);

    // ── تحليل السبام والذكاء الاصطناعي (مع تحليل الصور الدائم) ──────────────────────────────
    let spamResult = null;
    let aiResult   = null;

    try {
      // 🆕 detectSpam الآن يستقبل imageAnalysis (سيتم تعديله)
      spamResult = detectSpam({ mediaUrls, title, description, location });

      // 🆕 analyzeReport الآن يحلل الصور دائماً (تم تعديله مسبقاً)
      aiResult = await analyzeReport(
        title,
        description,
        category,
        mediaUrls,      // 🆕 الآن يرسل الصور للتحليل الدائم
        parseFloat(lat)  || null,
        parseFloat(lng)  || null
      );
     
      // 🆕 طباعة معلومات تحليل الصور إذا وجدت
      if (aiResult?.imageAnalysis && aiResult.imageAnalysis.length > 0) {
        const imagesWithIssues = aiResult.imageAnalysis.filter(img => img.hasIssues);
        console.log(`🖼️ IMAGE ANALYSIS: ${imagesWithIssues.length}/${mediaUrls.length} images show issues`);
        if (aiResult.usedImageAI) {
          console.log(`🤖 Used AI image analysis (confidence: ${aiResult.imageAnalysis?.confidence || 'N/A'}%)`);
        }
        if (aiResult.skippedFullAI) {
          console.log(`💰 COST SAVED: Skipped full AI analysis based on strong images`);
        }
      }
     
    } catch (error) {
      console.error("🔥 AI ERROR:", error);
    }

    // ── دمج النتائج عبر combineAIWithSpam ────────────────────────────
    const combined = combineAIWithSpam(spamResult, aiResult);
// ***Update Neeeew*** استخراج درجة السبام (spamScore) من نتيجة الدمج
    const spamScore = combined.spamScore || 0;
    // ***Update Neeeew*** رفض السبام العالي (≥70) – لا يتم حفظه في Report ويُحفظ في RejectedReport
        if (spamScore >= 70) {
          await RejectedReport.create({
            title, description, category, mediaUrls,
            spamScore, spamReasons: combined.reasons || [],
          });
          return res.status(400).json({
            success: false,
            rejected: true,
            message: "The report was not accepted. Please ensure the report concerns public infrastructure and includes a clear description and supporting images."
          });
        }
    
        // ***Update Neeeew*** جميع البلاغات المقبولة (spamScore < 70) تُحفظ بحالة "pending" (بدلاً من New/PendingReview)
        const finalStatus = "pending";
    
    // توليد التوصية
    const userRecommendationData = generateUserRecommendation(aiResult, spamResult, title, description);
    const finalPriority          = userRecommendationData.priority || aiResult?.priority || "Medium";

    // ── بناء كائن التحليل النهائي ─────────────────────────────────────
    const finalAiAnalysis = {
      spamScore:      combined.spamScore   || 0,
      spamLevel:      combined.spamLevel   || "Low",
      spamReasons:    combined.reasons     || [],
      spamPositives:  combined.positives   || [],
      spamSuggestion: combined.suggestion  || "",

      category:      combined.aiCategory   || category || "General",
      priority:      finalPriority,
      priorityScore: aiResult?.priorityScore || 50,
      severity:      aiResult?.severity      || "Moderate",
      confidence:    combined.aiConfidence   || 50,
      weather:       aiResult?.weather       || null,

      isRelevant: true,
      isSpam:     combined.isSpam || false,

      categoryCorrected: combined.categoryCorrected || false,
      originalCategory:  combined.originalCategory  || category,
      correctionReason:  combined.correctionReason  || null,
      forcedCorrection:  combined.forcedCorrection  || false,

      recommendation:       userRecommendationData.message,
      recommendationType:   userRecommendationData.type,
      recommendationAction: userRecommendationData.action,
      responsibleAuthority: userRecommendationData.authority || null,
      shortUserMessage:     generateShortUserMessage(userRecommendationData),
      adminRecommendation:  aiResult?.recommendation || generateFallbackRecommendation(aiResult),
     
      // ✅ مهم: تمرير privateType من aiResult
      privateType: aiResult?.privateType || null,
      isPrivateProperty: aiResult?.isPrivateProperty || false,
     
      // 🆕 إضافة معلومات تحليل الصور
      imageAnalysis: aiResult?.imageAnalysis || [],
      usedImageAI: aiResult?.usedImageAI || false,
      skippedFullAI: aiResult?.skippedFullAI || false,
    };

    // ============================================================
    // ✅ FIX: معالجة المساجد بشكل صحيح (الجزء المعدل)
    // ============================================================
   
    let finalCategory = finalAiAnalysis.category;
    let finalAuthority = null;
    let finalPrivateType = null;

    // ✅ كشف المسجد الخاص (من aiResult أو من finalAiAnalysis)
    const isPrivateMosque = aiResult?.privateType === "PRIVATE_MOSQUE" ||
                            finalAiAnalysis.privateType === "PRIVATE_MOSQUE" ||
                            (aiResult?.category === "Other" && aiResult?.analysisReason?.includes("Private mosque"));

    // ✅ كشف المسجد العام (من aiResult أو من finalAiAnalysis)
    const isPublicMosque = aiResult?.privateType === "PUBLIC_MOSQUE" ||
                           finalAiAnalysis.privateType === "PUBLIC_MOSQUE" ||
                           (aiResult?.category === "Public Facility Damage" && aiResult?.analysisReason?.includes("Public mosque"));

    // ✅ مسجد خاص
    if (isPrivateMosque) {
      finalCategory = "Other";
      finalAuthority = "General Authority";
      finalPrivateType = "PRIVATE_MOSQUE";
      console.log(`🕌 PRIVATE MOSQUE: Category=Other, Authority=General Authority`);
    }
    // ✅ مسجد عام
    else if (isPublicMosque) {
      finalCategory = "Public Facility Damage";
      finalAuthority = "Ministry of Awqaf";
      finalPrivateType = "PUBLIC_MOSQUE";
      console.log(`🕌 PUBLIC MOSQUE: Category=Public Facility Damage, Authority=Ministry of Awqaf`);
    }
    // ✅ منزل خاص
    else if (aiResult?.isPrivateProperty && aiResult?.privateType === "HOUSE") {
      finalCategory = finalAiAnalysis.category;
      finalAuthority = "General Authority";
      finalPrivateType = "HOUSE";
      console.log(`🏠 PRIVATE HOUSE: Authority=General Authority`);
    }
    // ✅ باقي الحالات - use smartRouteReport
    else {
      const routing = smartRouteReport(finalAiAnalysis.category, description);
      finalAuthority = routing.authority;
      finalPrivateType = null;
    }

    // تحديث finalAiAnalysis بالقيم الصحيحة
    finalAiAnalysis.category = finalCategory;
    finalAiAnalysis.assignedAuthority = finalAuthority;
    finalAiAnalysis.privateType = finalPrivateType;

    const reportStatus = finalAiAnalysis.isSpam ? "spam" : "pending";

    // ── إنشاء التقرير في قاعدة البيانات ──────────────────────────────
    const report = await Report.create({
      title,
      category:             finalCategory,
      description,
      location,
      governorate,
      coordinates: typeof coordinates === "string" ? JSON.parse(coordinates) : coordinates,
      media:                mediaUrls,
      createdBy:            req.userId,
      priority:             finalPriority,
      recommendation:       finalAiAnalysis.recommendation,
      recommendationType:   finalAiAnalysis.recommendationType,
      recommendationAction: finalAiAnalysis.recommendationAction,
      responsibleAuthority: finalAiAnalysis.responsibleAuthority,
      shortUserMessage:     finalAiAnalysis.shortUserMessage,
      adminRecommendation:  finalAiAnalysis.adminRecommendation,
      assignedAuthority:    finalAuthority,
      status: finalStatus,  // ***Update Neeeew*** دائماً "pending"
      aiAnalysis:           finalAiAnalysis,
      categoryCorrected:    finalAiAnalysis.categoryCorrected,
      originalCategory:     finalAiAnalysis.originalCategory,
      correctionReason:     finalAiAnalysis.correctionReason,
      forcedCorrection:     finalAiAnalysis.forcedCorrection,
      aiConfidence:         finalAiAnalysis.confidence,
      privateType:          finalPrivateType,  // ✅ حفظ نوع الملكية
      spamScore,                     // ***Update Neeeew*** حفظ درجة السبام
    
    });

    // ── إرجاع الرد مع جميع البيانات ──────────────────────────────────
    return res.json({
      success:           true,
      report,
      //Neeeew
      status: finalStatus,
      isSpam:            finalAiAnalysis.isSpam,
      spamScore:         finalAiAnalysis.spamScore,
      categoryCorrected: finalAiAnalysis.categoryCorrected,
      originalCategory:  finalAiAnalysis.originalCategory,
      correctionReason:  finalAiAnalysis.correctionReason,
      forcedCorrection:  finalAiAnalysis.forcedCorrection,
      privateType:       finalPrivateType,  // ✅ إرسال privateType للـ Frontend
     
      // 🆕 معلومات تحليل الصور للـ Frontend
      imageAnalysis: {
        analyzed: finalAiAnalysis.imageAnalysis.length > 0,
        imagesWithIssues: finalAiAnalysis.imageAnalysis.filter(img => img.hasIssues).length,
        usedAI: finalAiAnalysis.usedImageAI,
        costSaved: finalAiAnalysis.skippedFullAI
      },
     
      userRecommendation: {
        message:   userRecommendationData.message,
        priority:  finalPriority,
        type:      userRecommendationData.type,
        action:    userRecommendationData.action,
        authority: userRecommendationData.authority || finalAuthority,
      },
      recommendationType: finalAiAnalysis.recommendationType,
    });
   
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   📋 GET REPORTS
========================================================= */

app.get("/reports", authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* =========================================================
   🧠 ADMIN APIs
========================================================= */

app.get("/admin/reports", adminAuthenticate, async (req, res) => {
  try {
    const { status, category, governorate, priority, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status)              filter.status      = status;
    if (category)            filter.category    = category;
    if (governorate)         filter.governorate = governorate;
    if (priority)            filter.priority    = priority;
    if (search?.trim())      filter.title       = { $regex: search.trim(), $options: "i" };

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "name email"),
      Report.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems:  total,
        limit:       limitNum,
        hasNext:     pageNum < totalPages,
        hasPrev:     pageNum > 1,
      },
    });
  } catch (err) {
    console.error("❌ Error in /admin/reports:", err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/admin/reports/:id/status", adminAuthenticate, async (req, res) => {
  try {
    const { status, assignedAuthority, priority } = req.body;

    const updateData = {};
    if (status)            updateData.status            = status;
    if (assignedAuthority) updateData.assignedAuthority = assignedAuthority;
    if (priority)          updateData.priority          = priority;

    const validStatuses = ["pending", "in-progress", "resolved", "spam", "rejected"];
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Please provide at least one field to update" });
    }

    const report = await Report.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate("createdBy", "name email");

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.status(200).json({ success: true, message: "Report updated successfully", report });
  } catch (error) {
    console.error("Error in PUT /admin/reports/:id/status:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
});

app.get("/admin/reports/statistics", adminAuthenticate, async (req, res) => {
  try {
    const [total, pending, inProgress, resolved, spam, rejected, authorityDistribution] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "in-progress" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "spam" }),
      Report.countDocuments({ status: "rejected" }),
      Report.aggregate([{ $group: { _id: "$assignedAuthority", count: { $sum: 1 } } }]),
    ]);

    res.json({ success: true, stats: { total, pending, inProgress, resolved, spam, rejected, authorityDistribution } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   📊 PUBLIC APIs
========================================================= */

app.get("/public/reports/resolved", async (req, res) => {
  try {
    const reports = await Report.find({ status: "resolved" })
      .sort({ createdAt: -1 })
      .select("title description category status location governorate assignedAuthority recommendation media coordinates createdAt");
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/public/reports/statistics", async (req, res) => {
  try {
    const [total, pending, inProgress, resolved] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "in-progress" }),
      Report.countDocuments({ status: "resolved" }),
    ]);
    res.json({ success: true, stats: { total, pending, inProgress, resolved } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/public/tips", async (req, res) => {
  try {
    const tips = await Tip.find().sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, tips });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/public/users/count", async (req, res) => {
  try {
    const count = await User.countDocuments({ role: "citizen" });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



































// ============================================================
// 🧠 HELPER FUNCTIONS FOR FEEDBACK ANALYSIS (Supports Arabic & English)
// ============================================================

/**
 * Sentiment Analysis Function
 * Supports both Arabic and English languages
 */
function detectSentiment(text) {
  const lower = text.toLowerCase();
 
  // Positive words (Arabic + English)
  const positiveWords = [
    // English
    'good', 'great', 'excellent', 'easy', 'love', 'amazing', 'perfect',
    'useful', 'helpful', 'fast', 'quick', 'beautiful', 'nice', 'awesome',
    'recommend', 'satisfied', 'happy', 'impressed', 'wonderful', 'friendly',
    'like', 'best', 'wonderful', 'fantastic', 'superb', 'outstanding',
    // Arabic
    'جيد', 'ممتاز', 'رائع', 'سهل', 'حلو', 'جميل', 'سريع', 'مفيد',
    'شكرا', 'رائعة', 'سهلة', 'سريعة', 'لطيف', 'ودود', 'حب', 'عظيم',
    'ممتازة', 'جميلة', 'يسهل', 'يفيد', 'يساعد', 'رائعون', 'أحسنتم',
    'تسلمون', 'الله يسعدكم', 'ما شاء الله', 'تبارك الرحمن'
  ];
 
  // Negative words (Arabic + English)
  const negativeWords = [
    // English
    'bad', 'slow', 'bug', 'crash', 'hate', 'confusing', 'difficult',
    'terrible', 'useless', 'waste', 'problem', 'issue', 'error',
    'not working', 'frustrating', 'annoying', 'disappointed', 'poor', 'worst',
    'sucks', 'awful', 'horrible', 'broken', 'failed',
    // Arabic
    'سيء', 'بطيء', 'خلل', 'مشكلة', 'خطأ', 'صعب', 'تعبان', 'زفت', 'خريان',
    'ما يشتغل', 'يعلق', 'يتعطل', 'ما يرفع', 'ما يضبط', 'فاشل', 'رديء',
    'سيئة', 'بطيئة', 'متعبة', 'صعبة', 'خطيرة', 'مضروب', 'مو عاجبني',
    'ما يعجبني', 'يزعل', 'يضيق', 'يتعب', 'يطفش'
  ];

  let positive = 0;
  let negative = 0;

  positiveWords.forEach(word => { if (lower.includes(word)) positive++; });
  negativeWords.forEach(word => { if (lower.includes(word)) negative++; });

  console.log(`📊 Sentiment Analysis - Positive: ${positive}, Negative: ${negative}`);

  // Determine sentiment based on word count
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

/**
 * Urgency Detection Function
 * Supports both Arabic and English
 */
function detectUrgency(text, rating) {
  const lower = text.toLowerCase();
 
  // Urgency indicator words (Arabic + English)
  const urgencyWords = [
    // English
    'urgent', 'emergency', 'asap', 'immediately', 'critical', 'danger',
    'serious', 'important', 'quickly', 'right now', 'help', 'emergency',
    'dangerous', 'hazard', 'life threatening', 'crisis', 'disaster',
    // Arabic
    'طوارئ', 'عاجل', 'خطير', 'مهم', 'حالا', 'بسرعة', 'اسع', 'انقذ',
    'خطر', 'كارثة', 'مأساة', 'حريق', 'انهيار', 'تصدع', 'تسرب', 'غرق',
    'طارئ', 'استعجال', 'فوري', 'عاجلة', 'خطيرة', 'حرج', 'الآن', 'حاليا'
  ];
 
  let urgencyScore = 0;
  urgencyWords.forEach(word => { if (lower.includes(word)) urgencyScore++; });
 
  // Determine urgency level
  if (rating <= 2 && urgencyScore >= 1) return 'critical';
  if (urgencyScore >= 2) return 'high';
  if (urgencyScore === 1) return 'medium';
  return 'low';
}

/**
 * Problem Category Detection Function
 * Supports both Arabic and English
 */
function detectCategory(text, rating) {
  const lower = text.toLowerCase();
 
  // Problem categories with keywords (Arabic + English)
  const categories = {
    // Road problems
    'Road Damage': [
      'road', 'street', 'pothole', 'asphalt', 'crack', 'damage', 'highway',
      'طريق', 'شارع', 'حفرة', 'مطبة', 'تصدع', 'انهيار', 'تهالك', 'زفت'
    ],
    // Flooding/Drainage problems
    'Flooding/Drainage': [
      'flood', 'water', 'drain', 'rain', 'sewer', 'flooding', 'plumbing',
      'مطر', 'سيول', 'فيضان', 'مياه', 'صرف', 'مجرى', 'بئر', 'غرق', 'تسرب'
    ],
    // Street lighting problems
    'Street Lighting': [
      'light', 'lamp', 'dark', 'street light', 'lighting', 'bulb',
      'إنارة', 'ضوء', 'عمود', 'ظلام', 'عتمة', 'نور', 'مصباح'
    ],
    // Waste management problems
    'Waste Management': [
      'waste', 'garbage', 'trash', 'rubbish', 'clean', 'dump',
      'نفايات', 'قمامة', 'زبالة', 'مكبات', 'نظافة', 'قذر', 'وسخ'
    ],
    // Public facility damage
    'Public Facility Damage': [
      'park', 'school', 'hospital', 'mosque', 'facility', 'public', 'garden',
      'حديقة', 'ملعب', 'مدرسة', 'مستشفى', 'مسجد', 'مبنى', 'مرافق', 'عامة'
    ],
    // Platform performance issues
    'Performance': [
      'slow', 'lag', 'crash', 'freeze', 'loading', 'timeout', 'error', 'bug',
      'بطيء', 'يعلق', 'يتعطل', 'خلل', 'تحميل', 'بطيئة', 'تعلق'
    ],
    // UI/UX issues
    'UI/UX': [
      'confusing', 'hard to use', 'difficult', 'complicated', 'design', 'navigation',
      'صعب', 'مربك', 'معقد', 'واجهة', 'تصميم', 'تنقل'
    ],
    // Feature requests
    'Feature Request': [
      'add', 'would like', 'wish', 'suggest', 'feature', 'improve', 'enhance',
      'أضيفوا', 'نقترح', 'نتمنى', 'ميزة', 'خاصية', 'تطوير', 'تحسين', 'نريد'
    ],
    // General complaints
    'Complaint': [
      'bad', 'terrible', 'useless', 'waste', 'frustrating', 'angry', 'hate',
      'سيء', 'تعبان', 'زفت', 'فاشل', 'رديء', 'يزعل', 'يضيق'
    ]
  };
 
  // Search through all categories
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        console.log(`📌 Problem categorized as: ${category}`);
        return category;
      }
    }
  }
 
  // Default classification based on rating
  if (rating <= 2) return 'Complaint';
  if (rating >= 4) return 'Satisfaction';
  return 'General';
}

/**
 * Spam Detection Function
 */
function detectSpamFeedback(message, username, email) {
  // Message too short
  if (message.length < 10) {
    return { isSpam: true, reason: 'Message is too short (less than 10 characters)' };
  }
 
  // Repeated character pattern
  if (/(.)\1{10,}/.test(message)) {
    return { isSpam: true, reason: 'Repeated character more than 10 times' };
  }
 
  // Common spam patterns (Arabic + English)
  const spamPatterns = [
    'test', 'asdf', 'qwerty', 'zxcv', '12345', 'lorem ipsum',
    'تجربة', 'اختبار', 'تست', 'تيست'
  ];
 
  for (const pattern of spamPatterns) {
    if (message.toLowerCase().includes(pattern)) {
      return { isSpam: true, reason: `Contains spam pattern: "${pattern}"` };
    }
  }
 
  return { isSpam: false, reason: '' };
}

/**
 * Keyword Extraction Function
 * Supports both Arabic and English
 */
function extractKeywords(text) {
  // Common stop words to ignore (Arabic + English)
  const stopWords = [
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'this',
    'that', 'these', 'those', 'from', 'into', 'through', 'during',
    // Arabic
    'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بين', 'بعد', 'قبل', 'أثناء',
    'هذا', 'هذه', 'ذلك', 'تلك', 'كان', 'و', 'قد', 'لا', 'ما', 'وقد',
    'فإن', 'إذا', 'عند', 'حيث', 'بأن', 'لقد', 'هو', 'هي', 'هم', 'نحن'
  ];
 
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = {};
 
  words.forEach(word => {
    // Clean the word from punctuation
    word = word.replace(/[^\w\u0600-\u06FF]/g, '');
    if (word.length > 2 && !stopWords.includes(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
 
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);
}

/**
 * Individual Feedback Analysis Function
 * Analyzes sentiment, urgency, category, and calculates priority score
 */
async function analyzeSingleFeedback(message, rating, username, email) {
  console.log(`🔍 Starting new feedback analysis...`);
 
  const sentiment = detectSentiment(message);
  const urgency = detectUrgency(message, rating);
  const category = detectCategory(message, rating);
  const spam = detectSpamFeedback(message, username, email);
  const keywords = extractKeywords(message);
 
  // Calculate Priority Score (0 to 100)
  let priorityScore = 50;
 
  // Adjust based on urgency level
  if (urgency === 'critical') priorityScore = 95;
  else if (urgency === 'high') priorityScore = 80;
  else if (urgency === 'medium') priorityScore = 60;
  else priorityScore = 40;
 
  // Adjust based on sentiment
  if (sentiment === 'positive') priorityScore -= 10;
  if (sentiment === 'negative') priorityScore += 15;
 
  // Adjust based on rating
  if (rating <= 2) priorityScore += 20;
  if (rating >= 4) priorityScore -= 10;
 
  // Adjust based on category
  if (category === 'Feature Request') priorityScore = 55;
  if (category === 'Satisfaction') priorityScore = Math.max(30, priorityScore - 15);
  if (category === 'Road Damage' || category === 'Flooding/Drainage') priorityScore += 15;
  if (category === 'Complaint') priorityScore += 10;
 
  // Ensure score is between 0 and 100
  priorityScore = Math.min(100, Math.max(0, priorityScore));
 
  // Generate appropriate summary based on analysis
  let summary = '';
  if (sentiment === 'positive') {
    if (category === 'Feature Request') {
      summary = `💡 Happy user suggesting platform improvements and developments`;
    } else if (category === 'Satisfaction') {
      summary = `😊 Very satisfied user praising the platform experience and service`;
    } else {
      summary = `👍 Positive experience from a satisfied user`;
    }
  } else if (sentiment === 'negative') {
    if (category === 'Road Damage' || category === 'Flooding/Drainage') {
      summary = `⚠️ User reports a serious infrastructure issue requiring immediate intervention`;
    } else {
      summary = `😞 User facing issues expecting service improvement and quick resolution`;
    }
  } else {
    if (category === 'Feature Request') {
      summary = `💭 User suggests adding new features and developments to the platform`;
    } else if (category === 'Satisfaction') {
      summary = `📝 User provides positive feedback praising platform quality`;
    } else {
      summary = `📋 User provides general feedback and suggestions about the platform`;
    }
  }
 
  // Appropriate recommendations based on category
  let recommendedAction = '';
  switch (category) {
    case 'Feature Request':
      recommendedAction = '💡 Review suggestions and add them to the development roadmap';
      break;
    case 'Satisfaction':
      recommendedAction = '🏆 Maintain the same high level of service and quality';
      break;
    case 'Performance':
      recommendedAction = '⚡ Improve server response time and reduce loading latency';
      break;
    case 'UI/UX':
      recommendedAction = '🎨 Simplify user interface and improve navigation experience';
      break;
    case 'Reporting':
      recommendedAction = '🔧 Check reporting system and ensure image/location upload works';
      break;
    case 'Communication':
      recommendedAction = '📞 Improve communication system and respond to users faster';
      break;
    case 'Road Damage':
      recommendedAction = '🚧 Send maintenance teams immediately to repair roads and fill potholes';
      break;
    case 'Flooding/Drainage':
      recommendedAction = '💧 Urgent coordination with municipality to address drainage issue';
      break;
    case 'Street Lighting':
      recommendedAction = '💡 Contact lighting department to repair poles and fix faults';
      break;
    case 'Waste Management':
      recommendedAction = '🗑️ Direct cleaning teams to remove waste and clean the area';
      break;
    case 'Public Facility Damage':
      recommendedAction = '🏢 Contact the authority responsible for the public facility';
      break;
    case 'Complaint':
      recommendedAction = '🔍 Review the complaint and contact the user to resolve the issue';
      break;
    default:
      recommendedAction = '🔍 Review the report and direct it to the appropriate authority';
  }
 
  // Calculate toxicity score
  let toxicity = 0;
  const toxicWords = [
    'stupid', 'useless', 'waste', 'hate', 'terrible', 'worst', 'sucks',
    'زفت', 'خريان', 'حرامي', 'لعين'
  ];
  toxicWords.forEach(word => { if (message.toLowerCase().includes(word)) toxicity += 20; });
  toxicity = Math.min(toxicity, 100);
 
  console.log(`✅ Analysis results: sentiment=${sentiment}, urgency=${urgency}, category=${category}, priority=${priorityScore}`);
 
  return {
    sentiment,
    urgency,
    category,
    toxicity,
    summary,
    priorityScore,
    recommendedAction,
    isSpam: spam.isSpam,
    spamReason: spam.reason,
    keywords
  };
}

// ============================================================
// 🤖 AI FEEDBACK ANALYSIS (Using Groq API)
// ============================================================

/**
 * Comprehensive feedback analysis using Groq API
 * Analyzes all comments and provides actionable recommendations
 */
async function analyzeFeedbackWithAI(feedbacks) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
 
  // If no API key exists, use advanced local analysis
  if (!GROQ_API_KEY) {
    console.warn("⚠️ GROQ_API_KEY not set. Using local analysis.");
    return generateAdvancedLocalAnalysis(feedbacks);
  }

  const recentFeedbacks = feedbacks.slice(0, 20);
  if (recentFeedbacks.length === 0) return null;

  // Build analysis text from user comments (Arabic and English)
  const feedbackText = recentFeedbacks.map((fb, idx) => `
[Feedback #${idx + 1}]
- Rating: ${fb.rating}/5 stars
- Comment: ${fb.message}
- Date: ${new Date(fb.createdAt).toLocaleDateString()}
---`).join("\n");

  const prompt = `You are a data analysis expert specialized in "Taraqqub" platform - an infrastructure issue reporting platform.

Analyze the following user comments and provide a comprehensive evaluation in English.

Comments:
${feedbackText}

Return JSON with the following structure only (no additional text):
{
  "summary": "One sentence summary of all comments",
  "overallSentiment": "positive" | "neutral" | "negative",
  "averageRating": number (0-5),
  "keyStrengths": ["strength 1", "strength 2"],
  "keyIssues": ["issue 1", "issue 2"],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "category": "UI/UX" | "Performance" | "Feature" | "Reporting" | "Communication",
      "title": "Recommendation title",
      "description": "Detailed recommendation description",
      "expectedImpact": "Expected impact of this recommendation"
    }
  ],
  "urgentActions": ["urgent action 1", "urgent action 2"],
  "userQuotes": ["impactful quote 1", "impactful quote 2"]
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    console.log("✅ Groq API Response received");
   
    const content = data.choices?.[0]?.message?.content;
   
    if (content) {
      let jsonText = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(jsonText);
      console.log("📊 Analysis completed:", analysis.summary);
      return analysis;
    }
   
    return generateAdvancedLocalAnalysis(feedbacks);
  } catch (error) {
    console.error("❌ Groq API Error:", error);
    return generateAdvancedLocalAnalysis(feedbacks);
  }
}

// ============================================================
// 📊 Advanced Local Analysis (No API Required)
// ============================================================

/**
 * Advanced local analysis function based on keyword matching
 * Used when no API key is available
 */
function generateAdvancedLocalAnalysis(feedbacks) {
  console.log("📊 Generating local analysis from user comments...");
 
  const total = feedbacks.length;
  const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / total;
 
  // Combine all comments for analysis
  const allCommentsText = feedbacks.map(f => f.message.toLowerCase()).join(" ");
 
  // Keywords for detecting issues (Arabic + English)
  const issueKeywords = {
    'Performance': ['slow', 'lag', 'crash', 'freeze', 'loading', 'بطيء', 'يعلق', 'يتعطل'],
    'UI/UX': ['confusing', 'hard to use', 'difficult', 'صعب', 'مربك', 'معقد'],
    'Communication': ['no response', 'not resolved', 'ignored', 'ما رد', 'ما حل', 'تجاهل'],
    'Reporting': ['upload failed', 'not working', 'error', 'ما يشتغل', 'خطأ']
  };
 
  // Sentiment analysis
  const positiveWords = [
    'good', 'great', 'excellent', 'easy', 'love', 'amazing', 'perfect',
    'useful', 'helpful', 'fast', 'quick', 'nice', 'awesome', 'satisfied', 'happy',
    'جيد', 'ممتاز', 'رائع', 'سهل', 'جميل', 'سريع', 'مفيد', 'شكرا'
  ];
 
  const negativeWords = [
    'bad', 'slow', 'bug', 'crash', 'hate', 'confusing', 'difficult',
    'terrible', 'useless', 'problem', 'issue', 'error',
    'سيء', 'بطيء', 'خلل', 'مشكلة', 'خطأ', 'صعب', 'تعبان'
  ];
 
  let positiveCount = 0;
  let negativeCount = 0;
 
  feedbacks.forEach(f => {
    const lowerMsg = f.message.toLowerCase();
    positiveWords.forEach(word => { if (lowerMsg.includes(word)) positiveCount++; });
    negativeWords.forEach(word => { if (lowerMsg.includes(word)) negativeCount++; });
  });
 
  // Determine overall sentiment
  let overallSentiment = 'neutral';
  if (positiveCount > negativeCount) overallSentiment = 'positive';
  else if (negativeCount > positiveCount) overallSentiment = 'negative';
 
  // Extract issues
  const keyIssues = [];
  for (const [category, keywords] of Object.entries(issueKeywords)) {
    for (const keyword of keywords) {
      if (allCommentsText.includes(keyword)) {
        keyIssues.push(`${category}: "${keyword}"`);
        break;
      }
    }
  }
 
  if (keyIssues.length === 0 && negativeCount > 0) {
    keyIssues.push("General complaints from users need to be studied");
  }
 
  // Key strengths
  const keyStrengths = [];
  if (positiveCount > 0) {
    keyStrengths.push(`✅ ${positiveCount} positive comments from users`);
  }
  if (avgRating >= 4) {
    keyStrengths.push(`⭐ Excellent overall rating (${avgRating.toFixed(1)}/5)`);
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push("📊 Collecting more feedback to identify strengths");
  }
 
  // User quotes
  const userQuotes = feedbacks
    .filter(f => f.message && f.message.length > 15)
    .slice(0, 3)
    .map(f => `"${f.message.substring(0, 100)}${f.message.length > 100 ? '...' : ''}" - Rating: ${f.rating}/5`);
 
  // Recommendations
  const recommendations = [];
 
  if (avgRating < 3) {
    recommendations.push({
      priority: "high",
      category: "Satisfaction",
      title: "Improve User Satisfaction",
      description: `Average rating is ${avgRating.toFixed(1)}/5 which is below target. Focus on solving issues mentioned in comments.`,
      expectedImpact: "Increase user satisfaction and platform reputation"
    });
  }
 
  if (keyIssues.length > 0) {
    recommendations.push({
      priority: "high",
      category: "Performance",
      title: "Address User Issues",
      description: keyIssues.slice(0, 2).join(", "),
      expectedImpact: "Improve user experience and reduce complaints"
    });
  }
 
  if (recommendations.length === 0) {
    recommendations.push({
      priority: "medium",
      category: "General",
      title: "Collect More Feedback",
      description: `Only ${total} comments analyzed. Continue collecting feedback for more accurate results.`,
      expectedImpact: "Better understanding of user needs"
    });
  }
 
  // Urgent actions
  const urgentActions = [];
  if (avgRating < 2.5) urgentActions.push("🚨 Schedule urgent meeting to review platform issues");
  if (negativeCount > positiveCount * 2) urgentActions.push("📞 Reach out to dissatisfied users to understand their issues");
  if (keyIssues.length > 3) urgentActions.push("🔧 Form a task force to resolve recurring issues");
 
  if (urgentActions.length === 0 && avgRating >= 4) {
    urgentActions.push("📈 Continue developing the platform based on positive feedback");
  } else if (urgentActions.length === 0) {
    urgentActions.push("📊 Monitor incoming comments regularly to identify trends");
  }
 
  return {
    summary: `Analysis of ${total} comments: Average rating ${avgRating.toFixed(1)}/5, overall sentiment is ${overallSentiment}.`,
    overallSentiment: overallSentiment,
    averageRating: parseFloat(avgRating.toFixed(1)),
    keyStrengths: keyStrengths,
    keyIssues: keyIssues.length > 0 ? keyIssues : ["No clear issues identified in current comments"],
    recommendations: recommendations,
    urgentActions: urgentActions,
    userQuotes: userQuotes
  };
}

// ============================================================
// 📋 FEEDBACK API ROUTES
// ============================================================

/**
 * 1️⃣ POST - Submit new feedback
 * Receives feedback from users, analyzes it, and saves to database
 */
app.post("/api/feedback", async (req, res) => {
  try {
    const { username, email, rating, message, platform, language, userAgent, categoryHint } = req.body;

    // Validate input data
    if (!username || !email || !rating || !message) {
      return res.status(400).json({ success: false, message: "All fields are required: name, email, rating, message" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5 stars" });
    }

    // Automatic feedback analysis using AI
    const aiResult = await analyzeSingleFeedback(message, rating, username, email);
   
    // Save feedback with analysis results to database
    const feedback = await Feedback.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      rating: Number(rating),
      message: message.trim(),
      platform: platform || '',
      language: language || '',
      userAgent: userAgent || '',
      categoryHint: categoryHint || 'general',
      aiAnalysis: {
        sentiment: aiResult.sentiment,        // Sentiment: positive/neutral/negative
        urgency: aiResult.urgency,            // Urgency: critical/high/medium/low
        category: aiResult.category,          // Category: Road Damage, Performance, etc.
        toxicity: aiResult.toxicity,          // Toxicity: 0-100
        summary: aiResult.summary,            // Analysis summary
        priorityScore: aiResult.priorityScore, // Priority score: 0-100
        recommendedAction: aiResult.recommendedAction, // Recommended action
        isSpam: aiResult.isSpam,              // Is it spam?
        spamReason: aiResult.spamReason,      // Reason for spam classification
        keywords: aiResult.keywords,          // Extracted keywords
      },
      analyzedAt: new Date()                  // Analysis date and time
    });

    console.log(`📊 New feedback: ${aiResult.sentiment}, ${aiResult.urgency}, priority: ${aiResult.priorityScore}`);

    res.status(200).json({ success: true, feedback, aiAnalysis: aiResult });
  } catch (err) {
    console.error("❌ Error saving feedback:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2️⃣ GET - Fetch last 50 feedbacks (public view)
 * This route is public and requires no authentication
 */
app.get("/api/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 3️⃣ GET - Comprehensive AI analysis (admin only)
 * Analyzes all feedbacks and provides actionable recommendations
 * Note: Must come before /admin/feedback/:id route
 */
app.get("/admin/feedback/ai-analysis", adminAuthenticate, async (req, res) => {
  try {
    console.log("📊 Fetching feedbacks for AI analysis...");
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(30);
   
    if (feedbacks.length === 0) {
      return res.json({ success: true, analysis: null, message: "No feedbacks to analyze yet" });
    }

    const analysis = await analyzeFeedbackWithAI(feedbacks);
    res.json({ success: true, analysis, totalFeedbacks: feedbacks.length });
  } catch (error) {
    console.error("❌ Error in AI analysis:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 4️⃣ GET - Fetch all feedbacks (admin only)
 * Displays all feedbacks with filtering capabilities
 */
app.get("/admin/feedback", adminAuthenticate, async (req, res) => {
  try {
    console.log("📊 Fetching all feedbacks for admin...");
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json({ success: true, feedbacks, count: feedbacks.length });
  } catch (err) {
    console.error("❌ Error fetching feedbacks:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5️⃣ DELETE - Delete feedback (admin only)
 * Deletes a specific feedback using its ID
 */
app.delete("/admin/feedback/:id", adminAuthenticate, async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }
    console.log(`🗑️ Feedback deleted: ${req.params.id}`);
    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting feedback:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

























































































/* =========================================================
   👤 USER PROFILE MANAGEMENT
========================================================= */

app.put("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) return res.status(400).json({ message: "Email already in use" });
    }

    const user = await User.findByIdAndUpdate(userId, { name, email, phone }, { new: true, runValidators: true })
      .select("-password");

    res.json({ success: true, user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/user/:userId/password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/user/:userId/reports", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const reports = await Report.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .select("title description category status location governorate assignedAuthority recommendation media coordinates createdAt");
    res.json({ success: true, reports });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const [totalReports, resolvedReports, pendingReports, inProgressReports] = await Promise.all([
      Report.countDocuments({ createdBy: userId }),
      Report.countDocuments({ createdBy: userId, status: { $in: ["resolved", "completed"] } }),
      Report.countDocuments({ createdBy: userId, status: "pending" }),
      Report.countDocuments({ createdBy: userId, status: "in-progress" }),
    ]);

    res.json({ success: true, stats: { totalReports, resolvedReports, pendingReports, inProgressReports } });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ legacy route — يبقى للتوافق مع النسخ القديمة
app.get("/user/:userId/reports", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const reports = await Report.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .select("title description category status location governorate assignedAuthority recommendation media coordinates createdAt");
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================================================
   ❌ 404 Handler
========================================================= */

app.use((req, res) => {
  console.log("❌ 404 - Route not found:", req.method, req.url);
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

/* =========================================================
   🚀 START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n========================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`========================================\n`);
});