/**
 * 🎯 الهدف من هذا الملف:
 * تحليل البلاغات الواردة من المستخدمين باستخدام:
 * 1. نظام قواعد (Rule-based) لكشف السبام
 * 2. تصحيح تلقائي بالكلمات المفتاحية (سريع ومجاني)
 * 3. 🆕 تحليل الصور دائماً باستخدام AI (للحالات المعقدة)
 * 4. تكامل مع خدمة الطقس لتعديل الأولويات
 * 5. توليد توصيات ذكية للمستخدم
 *
 * 👤 الجمهور المستهدف بالتوصيات: المستخدم العادي (المواطن)
 * 🏢 الجمهور المستهدف بالإحصائيات: الأدمن
 *
 * 🆕 التحسينات المضافة:
 * - ✅ تحليل الصور دائماً (حتى قبل التصحيح بالكلمات)
 * - ✅ ضغط حقيقي للصور باستخدام Sharp
 * - ✅ تجنب التحليل المزدوج (توفير التكاليف)
 * - ✅ كشف إذا الصورة تظهر مشكلة واضحة
 * - ✅ تحديد عدد الصور المرسلة (أول 3 صور فقط)
 * - ✅ أولوية للصورة على النص الضعيف
 *
 * ================================================================
 */

import fetch from "node-fetch";
import dotenv from "dotenv";
import sharp from "sharp"; // 🆕 ضغط حقيقي للصور
import { getWeather } from "./weatherService.js";

dotenv.config();

/* ------------------------------------------------------------------ */
/*  ⚙️ 1. منطقة الإعدادات                                             */
/* ------------------------------------------------------------------ */

const CONFIG = {
  SPAM_HIGH: 70,
  SPAM_MEDIUM: 40,
 
  WEIGHTS: {
    SHORT_TITLE: 15,
    SHORT_DESC: 15,
    SPAM_WORD: 8,
    REPEATED_CHARS: 12,
    DUPLICATE_TITLE_DESC: 18,
    NUMERIC_TITLE: 25,
    LOW_VOCAB: 12,
    VAGUE_OTHER: 10,
    LEGIT_WORD: 6,
    CATEGORY_MATCH: 7,
    DETAILED_DESC: -15,
    LOCATION_PROVIDED: -8,
  },
 
  CONTEXT: {
    ENABLED: true,
    MIN_WORDS_FOR_CONTEXT: 5,
  },
 
  CATEGORY_CORRECTION: {
    ENABLED: true,
    MIN_CONFIDENCE: 60,
    FORCE_CORRECTION: true,
  },
 
  IMAGES: {
    MAX_SIZE_MB: 20,
    SUPPORTED_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp"],
    COMPRESS_QUALITY: 80,
    MAX_WIDTH: 1500,
    MAX_IMAGES_TO_ANALYZE: 3, // 🆕 حد أقصى 3 صور للتحليل
  }
};

const CATEGORIES = [
  "Road Damage",
  "Flooding/Drainage",
  "Blocked Drain",
  "Street Lighting",
  "Traffic Signal",
  "Waste Management",
  "Public Facility Damage",
  "Other"
];

/* ------------------------------------------------------------------ */
/*  🔑 2. كشف الملكية الخاصة                                          */
/* ------------------------------------------------------------------ */

function detectPrivateProperty(title = "", description = "") {
  const combined = `${title} ${description}`.toLowerCase();

  const houseKeywords = [
    "منزل", "بيت", "فيلا", "شقة", "عمارة", "سكن", "ملك خاص",
    "our house", "my house", "my home", "my villa", "my apartment",
    "house", "home", "villa", "apartment", "private residence",
  ];
  for (const kw of houseKeywords) {
    if (combined.includes(kw)) {
      return { isPrivate: true, type: "HOUSE", keyword: kw };
    }
  }

  const hasMosque = combined.includes("مسجد") || combined.includes("جامع") ||
    combined.includes("mosque") || combined.includes("masjid");

  if (hasMosque) {
    const privateLocationIndicators = [
      "مول", "فندق", "شركة", "تجاري", "مكتب", "برج", "مبنى",
      "سوق", "بلازا", "مطعم", "مركز", "كافيه",
      "mall", "hotel", "company", "commercial", "office", "tower",
      "building", "market", "plaza", "restaurant", "center", "centre", "cafe",
    ];
    for (const ind of privateLocationIndicators) {
      if (combined.includes(ind)) {
        return {
          isPrivate: true,
          type: "PRIVATE_MOSQUE",
          keyword: `mosque + ${ind}`,
          privateLocation: ind,
          suggestedCategory: "Other",
          suggestedAuthority: "General Authority"
        };
      }
    }
    return { isPrivate: false, type: "PUBLIC_MOSQUE", keyword: "mosque" };
  }

  const businessMap = {
    "فندق": "HOTEL", "hotel": "HOTEL",
    "شركة": "COMPANY", "company": "COMPANY",
    "مول": "MALL", "mall": "MALL",
    "مطعم": "RESTAURANT", "restaurant": "RESTAURANT",
    "مصنع": "FACTORY", "factory": "FACTORY",
    "كافيه": "CAFE", "cafe": "CAFE",
    "خاص": "PRIVATE", "private": "PRIVATE",
    "ملكية": "PRIVATE",
  };
  for (const [kw, btype] of Object.entries(businessMap)) {
    if (combined.includes(kw)) {
      return { isPrivate: true, type: btype, keyword: kw };
    }
  }

  return { isPrivate: false, type: null, keyword: null };
}

/* ------------------------------------------------------------------ */
/*  🔤 3. توحيد النصوص                                               */
/* ------------------------------------------------------------------ */

function normalize(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\u0600-\u06FF]/g, '');
}

/* ------------------------------------------------------------------ */
/*  🌤️ 4. تعديل الأولوية بناءً على الطقس                             */
/* ------------------------------------------------------------------ */

function adjustPriorityByWeather(category, currentPriority, weather) {
  let priority = currentPriority;

  if (weather === "Rain") {
    if (category === "Flooding/Drainage" || category === "Blocked Drain") {
      priority = "High";
    }
    if (category === "Road Damage") {
      priority = "Medium";
    }
  }

  if (weather === "Thunderstorm") {
    priority = "High";
  }

  return priority;
}

/* ------------------------------------------------------------------ */
/*  📚 5. الكلمات المفتاحية                                          */
/* ------------------------------------------------------------------ */

const SPAM_KEYWORDS_LIGHT = ["hi", "hello", "hey", "lol"];
const SPAM_KEYWORDS_HEAVY = [
  "test", "testing", "asdf", "qwerty",
  "dummy", "fake", "sample", "example", "placeholder",
  "wtf", "joke", "funny", "bored",
  "aaa", "bbb", "ccc", "zzz", "xxx",
];

const LEGITIMATE_KEYWORDS = [
  "road", "damage", "pothole", "crack", "broken", "flood", "water",
  "drain", "blocked", "light", "lamp", "signal", "traffic",
  "waste", "garbage", "facility", "building", "wall",
  "bridge", "sidewalk", "pavement", "leak", "overflow",
  "accident", "hazard", "dangerous",
  "urgent", "emergency", "critical",
  "muscat", "salalah", "sohar", "nizwa", "sur", "oman",
  "street", "avenue", "roundabout", "highway",
  "حفرة", "طريق", "متصدع", "مياه", "فيضان", "صرف صحي",
  "بالوعة", "مسدودة", "إنارة", "عمود", "إشارة", "مرور",
  "نفايات", "قمامة", "مبنى", "جدار", "جسر", "رصيف",
  "تسرب", "حادث", "خطر", "طارئ", "عاجل",
  "مسقط", "صلالة", "صحار", "نزوى", "صور"
];

const CATEGORY_KEYWORDS = {
  "Road Damage": ["road", "pothole", "crack", "asphalt", "pavement", "حفرة", "طريق", "متصدع"],
  "Flooding/Drainage": ["flood", "water", "drain", "overflow", "فيضان", "مياه", "صرف"],
  "Blocked Drain": ["drain", "blocked", "clogged", "بالوعة", "مسدودة", "صرف صحي", "مجاري", "انسداد"],
  "Street Lighting": ["light", "lamp", "dark", "bulb", "إنارة", "عمود"],
  "Traffic Signal": ["signal", "traffic", "intersection", "إشارة", "مرور"],
  "Waste Management": ["waste", "garbage", "trash", "نفايات", "قمامة", "زبالة", "مكب"],
  "Public Facility Damage": ["facility", "park", "wall", "building", "مبنى", "حديقة", "جدار"],
  "Other": [],
};

const BLOCKED_DRAIN_KEYWORDS = [
  "صرف صحي", "صرف", "بالوعة", "مسدودة", "مجاري", "انسداد",
  "drain", "blocked drain", "clogged drain", "blocked sewer",
  "clogged", "sewage", "manhole", "sewer",
  "water not draining", "water overflow", "drain overflow"
];

const REAL_FLOOD_KEYWORDS = [
  "فيضان", "سيول", "مياه الأمطار", "تجمع مياه", "أمطار غزيرة",
  "flood", "flooding", "water logging", "rain water", "heavy rain"
];

const ROAD_DAMAGE_KEYWORDS = [
  "حفرة", "طريق متضرر", "تشقق", "مطبات",
  "pothole", "potholes", "cracked road", "road damage", "asphalt crack"
];

const TRAFFIC_SIGNAL_KEYWORDS = [
  "إشارة مرور", "إشارة ضوئية", "إشارة معطلة",
  "traffic light", "traffic signal", "signal not working"
];

const WASTE_KEYWORDS = [
  "قمامة", "نفايات", "زبالة", "مكب", "نفايات منزلية",
  "garbage", "trash", "waste", "dump", "rubbish"
];

const STREET_LIGHT_KEYWORDS = [
  "إنارة", "عمود إنارة", "إنارة معطلة", "شارع مظلم",
  "street light", "lamp post", "light not working", "dark street"
];

/* ------------------------------------------------------------------ */
/*  🔧 6. دوال مساعدة                                                */
/* ------------------------------------------------------------------ */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(text, keyword) {
  return new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(text);
}

function filterKeywords(text, keywords) {
  return keywords.filter(keyword => matchesKeyword(text, keyword));
}

function hasContext(report, legitMatches) {
  if (!CONFIG.CONTEXT.ENABLED) return false;
 
  const { title, description } = report;
  const combined = `${title} ${description}`;
  const wordCount = combined.split(/\s+/).length;
 
  const hasLightSpam = filterKeywords(combined, SPAM_KEYWORDS_LIGHT).length > 0;
  const hasLegitWords = legitMatches.length > 0;
 
  return hasLightSpam && hasLegitWords && wordCount >= CONFIG.CONTEXT.MIN_WORDS_FOR_CONTEXT;
}

function detectRoadDamageIndependently(text) {
  const additionalRoadKeywords = [
    "road", "street", "highway", "asphalt", "pavement", "طريق", "شارع", "رصيف"
  ];
 
  let hasRoadKeyword = ROAD_DAMAGE_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
  let hasContextKeyword = additionalRoadKeywords.some(kw => text.includes(kw.toLowerCase()));
 
  return hasRoadKeyword || (hasContextKeyword && text.includes("damage"));
}

function correctCategoryByKeywords(title, description, userSelectedCategory) {
  const text = `${title} ${description}`.toLowerCase();
 
  if (BLOCKED_DRAIN_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Blocked Drain", confidence: 98, reason: "Detected drain/sewer issue" };
  }
 
  if (REAL_FLOOD_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Flooding/Drainage", confidence: 95, reason: "Detected flood/water accumulation" };
  }
 
  if (TRAFFIC_SIGNAL_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Traffic Signal", confidence: 95, reason: "Detected traffic signal issue" };
  }
 
  if (detectRoadDamageIndependently(text)) {
    return { category: "Road Damage", confidence: 95, reason: "Detected pothole/road damage" };
  }
 
  if (WASTE_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Waste Management", confidence: 95, reason: "Detected garbage/waste issue" };
  }
 
  if (STREET_LIGHT_KEYWORDS.some(kw => text.includes(kw))) {
    return { category: "Street Lighting", confidence: 95, reason: "Detected street light issue" };
  }
 
  return null;
}

/* ------------------------------------------------------------------ */
/*  🧠 7. كشف السبام                                                 */
/* ------------------------------------------------------------------ */

export function detectSpam(report = {}) {
  const title = normalize(report.title || "");
  const description = normalize(report.description || "");
  const category = report.category || "";
  const location = normalize(report.location || "");

  const combined = `${title} ${description}`;

  if (!combined.trim()) {
    return {
      spamScore: 100,
      spamLevel: "High",
      isSpam: true,
      color: "#E63946",
      reasons: ["Report is completely empty"],
      positives: [],
      suggestion: "Please provide a clear description of the issue",
      metadata: { wordCount: 0, uniqueRatio: 0, legitMatches: 0, contextDetected: false }
    };
  }

  let spamScore = 0;
  const reasons = [];
  const positives = [];

  if (title.replace(/\s/g, "").length < 5) {
    spamScore += CONFIG.WEIGHTS.SHORT_TITLE;
    reasons.push("Title is too short");
  }

  if (description.replace(/\s/g, "").length < 20) {
    spamScore += CONFIG.WEIGHTS.SHORT_DESC;
    reasons.push("Description is too short");
  }

  const heavySpamMatches = filterKeywords(combined, SPAM_KEYWORDS_HEAVY);
  if (heavySpamMatches.length) {
    spamScore += Math.min(heavySpamMatches.length * CONFIG.WEIGHTS.SPAM_WORD, 35);
    reasons.push(`Suspicious words: ${heavySpamMatches.slice(0, 2).join(', ')}`);
  }

  if (/(.)\1{4,}/.test(combined)) {
    spamScore += CONFIG.WEIGHTS.REPEATED_CHARS;
    reasons.push("Excessive character repetition");
  }

  if (normalize(title) === normalize(description) && title.length > 0) {
    spamScore += CONFIG.WEIGHTS.DUPLICATE_TITLE_DESC;
    reasons.push("Title matches description exactly");
  }

  if (/^\d+$/.test(title)) {
    spamScore += CONFIG.WEIGHTS.NUMERIC_TITLE;
    reasons.push("Title contains only numbers");
  }

  const words = combined.split(/\s+/).filter(w => w.length > 2);
  const uniqueRatio = words.length > 0 ? new Set(words).size / words.length : 1;
  if (uniqueRatio < 0.35 && words.length > 10) {
    spamScore += CONFIG.WEIGHTS.LOW_VOCAB;
    reasons.push("Excessive word repetition");
  }

  const legitMatches = filterKeywords(combined, LEGITIMATE_KEYWORDS);
  const legitCount = legitMatches.length;

  if (legitCount >= 2) {
    const reduction = Math.min(legitCount * CONFIG.WEIGHTS.LEGIT_WORD, 25);
    spamScore -= reduction;
    positives.push(`Relevant keywords: ${legitMatches.slice(0, 3).join(', ')}`);
  }

  if (category && CATEGORY_KEYWORDS[category]) {
    const matches = filterKeywords(combined, CATEGORY_KEYWORDS[category]);
    if (matches.length > 0) {
      spamScore -= matches.length * CONFIG.WEIGHTS.CATEGORY_MATCH;
      positives.push(`Matches category: ${category}`);
    }
  }

  const contextDetected = hasContext(report, legitMatches);
  if (contextDetected) {
    spamScore -= 10;
    positives.push("Real context detected for this report");
  }

  if (description.length > 60) {
    spamScore += CONFIG.WEIGHTS.DETAILED_DESC;
    positives.push("Detailed description");
  }

  if (location && location.length > 3) {
    spamScore += CONFIG.WEIGHTS.LOCATION_PROVIDED;
    positives.push("Location provided");
  }

  spamScore = Math.max(0, Math.min(100, spamScore));

  const uniqueReasons = [...new Set(reasons)];
  const uniquePositives = [...new Set(positives)];

  let spamLevel, isSpam, color, suggestion;

  if (spamScore >= CONFIG.SPAM_HIGH) {
    spamLevel = "High";
    isSpam = true;
    color = "#E63946";
    suggestion = "This report appears to be related to a private company, business, or property rather than a public service or government-related issue. Please contact the responsible private entity directly for assistance.";
  } else if (spamScore >= CONFIG.SPAM_MEDIUM) {
    spamLevel = "Medium";
    isSpam = false;
    color = "#FF9F1C";
    suggestion = "Your report lacks some details. Adding more information (location, clearer description) will help process it faster.";
  } else {
    spamLevel = "Low";
    isSpam = false;
    color = "#28a745";
    suggestion = "Good quality report. Thank you for helping improve our services!";
  }

  return {
    spamScore,
    spamLevel,
    isSpam,
    color,
    reasons: uniqueReasons.slice(0, 4),
    positives: uniquePositives.slice(0, 3),
    suggestion,
    metadata: {
      wordCount: words.length,
      uniqueRatio: Math.round(uniqueRatio * 100),
      legitMatches: legitCount,
      heavySpamMatches: heavySpamMatches.length,
      lightSpamMatches: filterKeywords(combined, SPAM_KEYWORDS_LIGHT).length,
      contextDetected
    }
  };
}

/* ------------------------------------------------------------------ */
/*  🎨 8. معلومات الشارة                                             */
/* ------------------------------------------------------------------ */

export function getSpamBadgeInfo(score = 0) {
  if (score >= CONFIG.SPAM_HIGH) {
    return {
      label: "Private Property Issue",
      bg: "#E63946",
      color: "#fff",
      level: "high",
      action: "requires_review"
    };
  }
  if (score >= CONFIG.SPAM_MEDIUM) {
    return {
      label: "Suspicious",
      bg: "#FF9F1C",
      color: "#333",
      level: "medium",
      action: "needs_attention"
    };
  }
  return {
    label: "Valid",
    bg: "#28a745",
    color: "#fff",
    level: "low",
    action: "auto_approve"
  };
}

/* ------------------------------------------------------------------ */
/*  🖼️ 9. معالجة الصور - ضغط حقيقي                                   */
/* ------------------------------------------------------------------ */

// 🆕 ضغط حقيقي للصور باستخدام Sharp
async function compressImage(buffer, mimeType) {
  try {
    let image = sharp(Buffer.from(buffer));
   
    // تحديد نوع الصورة وجودة الضغط
    if (mimeType === "image/png") {
      return await image
        .png({ quality: CONFIG.IMAGES.COMPRESS_QUALITY })
        .resize({ width: CONFIG.IMAGES.MAX_WIDTH, withoutEnlargement: true })
        .toBuffer();
    }
   
    if (mimeType === "image/webp") {
      return await image
        .webp({ quality: CONFIG.IMAGES.COMPRESS_QUALITY })
        .resize({ width: CONFIG.IMAGES.MAX_WIDTH, withoutEnlargement: true })
        .toBuffer();
    }
   
    // الـ JPEG والأنواع الأخرى
    return await image
      .jpeg({ quality: CONFIG.IMAGES.COMPRESS_QUALITY })
      .resize({ width: CONFIG.IMAGES.MAX_WIDTH, withoutEnlargement: true })
      .toBuffer();
     
  } catch (err) {
    console.error("Compression error:", err);
    return buffer; // Fallback إلى البفر الأصلي
  }
}

// 🆕 معالجة الصور (مع أخذ أول N صور فقط)
async function processImages(mediaUrls = []) {
  // خذ أول MAX_IMAGES_TO_ANALYZE صور فقط
  const urlsToProcess = mediaUrls.slice(0, CONFIG.IMAGES.MAX_IMAGES_TO_ANALYZE);
 
  console.log(`📸 Processing ${urlsToProcess.length}/${mediaUrls.length} images (max: ${CONFIG.IMAGES.MAX_IMAGES_TO_ANALYZE})`);
 
  const results = await Promise.all(
    urlsToProcess.map(async (url, index) => {
      try {
        console.log(`   📸 Image ${index + 1}: fetching...`);
        const res = await fetch(url);
        if (!res.ok) return null;
       
        const mimeType = res.headers.get("content-type");
       
        if (!CONFIG.IMAGES.SUPPORTED_TYPES.includes(mimeType)) {
          console.warn(`   ⚠️ Unsupported image format: ${mimeType}`);
          return null;
        }
       
        let buffer = await res.arrayBuffer();
       
        // التحقق من الحجم وضغطه إذا لزم الأمر
        const maxSizeBytes = CONFIG.IMAGES.MAX_SIZE_MB * 1024 * 1024;
        if (buffer.byteLength > maxSizeBytes) {
          console.log(`   📦 Image too large (${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB), compressing...`);
          buffer = await compressImage(buffer, mimeType);
         
          if (buffer.byteLength > maxSizeBytes) {
            console.warn(`   ⚠️ Image still too large after compression, skipping`);
            return null;
          }
          console.log(`   ✅ Compressed to ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
        }
       
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: mimeType
          }
        };
      } catch (error) {
        console.error(`   ❌ Error processing image: ${error.message}`);
        return null;
      }
    })
  );
 
  const validResults = results.filter(Boolean);
  console.log(`✅ Successfully processed ${validResults.length}/${urlsToProcess.length} images`);
  return validResults;
}

/* ------------------------------------------------------------------ */
/*  🤖 10. Gemini API                                                */
/* ------------------------------------------------------------------ */

async function callModel(model, contents, API_KEY) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    text = text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  🎯 11. التوصيات الذكية للمستخدم                                  */
/* ------------------------------------------------------------------ */

function getResponsibleAuthority(category) {
  const authorityMap = {
    "Road Damage": "Ministry of Transport",
    "Flooding/Drainage": "Municipality",
    "Blocked Drain": "Municipality",
    "Street Lighting": "Municipality",
    "Traffic Signal": "Royal Oman Police (ROP)",
    "Waste Management": "Municipality",
    "Public Facility Damage": "Ministry of Awqaf",
    "Other": "The concerned authority"
  };
  return authorityMap[category] || "The concerned authority";
}

export function generateUserRecommendation(aiResult, spamResult, title, description) {
  const { category, priority, confidence } = aiResult || {};
  const isSpam = spamResult?.isSpam || false;
  const spamScore = spamResult?.spamScore || 0;

  if (isSpam && spamScore >= 70) {
    return {
      message: "This report appears to be related to a private company, business, or property. Please contact the responsible private entity directly for assistance.",
      type: "spam",
      action: "resubmit",
      priority: "Low"
    };
  }

  if (spamScore >= 40 && spamScore < 70) {
    return {
      message: "Your report lacks some important details. Please add more information (precise location, clearer description, photos) to ensure faster processing.",
      type: "warning",
      action: "provide_more_details",
      priority: priority || "Medium"
    };
  }

  const privateCheck = detectPrivateProperty(title, description);

  if (privateCheck.isPrivate) {
    switch (privateCheck.type) {
      case "HOUSE":
        return {
          message: `This is a PRIVATE HOUSE issue (your home/private residence).

The Taraqqub platform ONLY handles PUBLIC infrastructure issues.

For issues inside your home or private property:
- Please contact a private maintenance company
- Or fix it yourself as the property owner

This report will NOT be processed by government authorities.`,
          type: "redirect",
          action: "contact_private_entity",
          authority: "the property owner/private maintenance",
          priority: "Low"
        };

      case "PRIVATE_MOSQUE":
        return {
          message: `This is a PRIVATE MOSQUE located inside a commercial property (${privateCheck.privateLocation || "shopping mall or commercial building"}).

This mosque is NOT owned by the government. The responsibility falls on the property owner or management.

This report will NOT be processed by the Ministry of Endowments.`,
          type: "redirect",
          action: "contact_private_entity",
          authority: "the property owner/management",
          priority: "Low"
        };

      default:
        return {
          message: "This appears to be a private property issue. Please contact the responsible private entity directly.",
          type: "redirect",
          action: "contact_private_entity",
          authority: "the private entity",
          priority: "Low"
        };
    }
  }

  if (privateCheck.type === "PUBLIC_MOSQUE") {
    return {
      message: `This report concerns a PUBLIC MOSQUE. It has been forwarded to the Ministry of Endowments and Religious Affairs for action. You can track the status through your account.`,
      type: "routed",
      action: "auto_routed",
      authority: "Ministry of Endowments and Religious Affairs",
      priority: priority || "Medium"
    };
  }

  const wasCategoryCorrected = aiResult?.categoryCorrected || false;
  const originalCategory = aiResult?.originalCategory;

  if (wasCategoryCorrected && originalCategory && originalCategory !== category) {
    return {
      message: `✅ Your report has been re-categorized from "${originalCategory}" to "${category}" based on AI analysis, and forwarded to ${getResponsibleAuthority(category)} for processing. This ensures your issue reaches the right team faster.`,
      type: "routed_corrected",
      action: "auto_routed",
      priority: priority || "Medium",
      wasCorrected: true,
      originalCategory,
      correctedCategory: category,
    };
  }

  const combined = `${title} ${description}`.toLowerCase();
  const govMap = {
    "school": "Ministry of Education",
    "مدرسة": "Ministry of Education",
    "hospital": "Ministry of Health",
    "health center": "Ministry of Health",
    "مستشفى": "Ministry of Health",
    "مركز صحي": "Ministry of Health",
  };
  for (const [kw, auth] of Object.entries(govMap)) {
    if (combined.includes(kw)) {
      return {
        message: `This report falls under the responsibility of ${auth}. It has been forwarded to them for processing. You can track the status through your account.`,
        type: "routed",
        action: "auto_routed",
        authority: auth,
        priority: priority || "Medium"
      };
    }
  }

  const responsible = getResponsibleAuthority(category);

  switch (category) {
    case "Flooding/Drainage":
      if (priority === "High") {
        return {
          message: `⚠️ WARNING: Serious water drainage issue! ${responsible} has been notified urgently. Please stay away from the area if possible.`,
          type: "emergency",
          action: "urgent_dispatch",
          priority: "High"
        };
      }
      return {
        message: `Your flooding/drainage report has been forwarded to ${responsible} for processing. You can track the status through your account.`,
        type: "routed",
        action: "auto_routed",
        priority: priority || "Medium"
      };

    case "Traffic Signal":
      return {
        message: `Your traffic signal report has been forwarded to ${responsible} for processing. This will be handled with high priority. You can track the status through your account.`,
        type: "routed",
        action: "auto_routed",
        priority: "High"
      };

    default:
      return {
        message: `Your report has been received and forwarded to ${responsible} for review. You can track the status through your account.`,
        type: "received",
        action: "under_review",
        priority: priority || "Medium"
      };
  }
}

export function generateShortUserMessage(recommendation) {
  if (recommendation.type === "spam") return "Private entity issue";
  if (recommendation.type === "warning") return "Please complete details";
  if (recommendation.type === "emergency") return "⚠️ Emergency - Notified";
  if (recommendation.type === "routed_corrected") return "✓ Category corrected";
  if (recommendation.type === "redirect") return "Contact owner/management";
  return "Forwarded for processing";
}

/* ------------------------------------------------------------------ */
/*  🤖 12. تحليل الذكاء الاصطناعي - النسخة النهائية                  */
/* ------------------------------------------------------------------ */

export async function analyzeReport(
  title,
  description,
  reportCategory,
  mediaUrls = [],
  lat,
  lng
) {
  const API_KEY = process.env.GEMINI_API_KEY;
 
  console.log(`\n🔍 ===== STARTING REPORT ANALYSIS =====`);
  console.log(`📝 User selected: "${reportCategory}"`);
  console.log(`📄 Title: "${title}"`);
  console.log(`📄 Description: "${description}"`);
  console.log(`📸 Media URLs: ${mediaUrls.length} image(s)`);
  console.log(`========================================\n`);

  // ============================================================
  // 🆕 STEP 0: ALWAYS ANALYZE IMAGES FIRST (حتى قبل أي شيء)
  // ============================================================
 
  let aiImageAnalysis = null;
  const hasImages = mediaUrls && mediaUrls.length > 0;
 
  if (hasImages && API_KEY) {
    console.log(`🖼️ [STEP 0] Images detected → Running AI image analysis...`);
   
    const imageParts = await processImages(mediaUrls);
   
    if (imageParts.length > 0) {
      const imagePrompt = `
Analyze the attached images for infrastructure issues in Oman.

Possible categories:
${CATEGORIES.join(", ")}

Focus on:
- potholes (holes/cracks in roads)
- flooding (water accumulation, standing water)
- blocked drains (clogged manholes, sewage issues)
- garbage (waste, trash accumulation)
- street lighting (broken lights, dark areas)
- damaged public facilities (parks, buildings, walls)
- traffic signals (broken traffic lights)

IMPORTANT RULES:
1. If the uploaded image clearly shows an issue, prioritize the visual evidence over any text description.
2. The user's text might be weak or incomplete - use the image as primary source.
3. If the image is blurry, dark, or doesn't show any infrastructure issue, set isIssueVisible to false.
4. Return ONLY valid JSON.

Return ONLY JSON:
{
  "detectedCategory": "one of the categories",
  "confidence": 0-100,
  "visualFindings": "brief description of what you see in the image",
  "severity": "Low/Moderate/Severe",
  "isIssueVisible": true
}`;

      const contents = [
        {
          parts: [
            { text: imagePrompt },
            ...imageParts
          ]
        }
      ];

      aiImageAnalysis = await callModel(
        "gemini-1.5-flash",
        contents,
        API_KEY
      );

      if (aiImageAnalysis) {
        console.log(`✅ AI Image Analysis Complete:`);
        console.log(`   📸 Detected: ${aiImageAnalysis.detectedCategory}`);
        console.log(`   🎯 Confidence: ${aiImageAnalysis.confidence}%`);
        console.log(`   👁️ Issue Visible: ${aiImageAnalysis.isIssueVisible}`);
        console.log(`   📝 Findings: ${aiImageAnalysis.visualFindings}`);
      } else {
        console.log(`⚠️ AI Image Analysis failed or returned null`);
      }
    } else {
      console.log(`⚠️ No valid images to analyze after processing`);
    }
  } else if (hasImages && !API_KEY) {
    console.log(`⚠️ Images present but no Gemini API key - skipping AI image analysis`);
  } else {
    console.log(`ℹ️ No images to analyze`);
  }

  // ============================================================
  // STEP 1: PRIVATE PROPERTY CHECK
  // ============================================================
 
  const privateCheck = detectPrivateProperty(title, description);
 
  if (privateCheck.type === "PRIVATE_MOSQUE") {
    console.log(`🕌 PRIVATE MOSQUE detected → Category: Other`);
   
    return {
      category: "Other",
      priority: "Low",
      priorityScore: 20,
      severity: "Low",
      confidence: 100,
      analysisReason: `Private mosque located inside ${privateCheck.privateLocation || "commercial property"}`,
      categoryCorrected: true,
      originalCategory: reportCategory,
      correctionReason: `Auto-corrected: Private mosque → Category set to "Other"`,
      forcedCorrection: true,
      isPrivateProperty: true,
      privateType: "PRIVATE_MOSQUE",
      assignedAuthority: "General Authority",
      imageAnalysis: aiImageAnalysis
    };
  }
 
  if (privateCheck.type === "PUBLIC_MOSQUE") {
    console.log(`🕌 PUBLIC MOSQUE detected → Category: Public Facility Damage`);
   
    let priority = "Medium";
    let priorityScore = 50;
    let severity = "Moderate";
   
    const combined = `${title} ${description}`.toLowerCase();
    if (combined.includes("emergency") || combined.includes("طارئ")) {
      priority = "High";
      priorityScore = 85;
      severity = "Severe";
    }
   
    return {
      category: "Public Facility Damage",
      priority: priority,
      priorityScore: priorityScore,
      severity: severity,
      confidence: 95,
      analysisReason: "Public mosque - requires maintenance or repair",
      categoryCorrected: true,
      originalCategory: reportCategory,
      correctionReason: `Auto-corrected to "Public Facility Damage" - public mosque issue`,
      forcedCorrection: true,
      isPrivateProperty: false,
      assignedAuthority: "Ministry of Awqaf",
      privateType: "PUBLIC_MOSQUE",
      imageAnalysis: aiImageAnalysis
    };
  }
 
  if (privateCheck.isPrivate) {
    console.log(`🏠 PRIVATE PROPERTY DETECTED: ${privateCheck.type} → Priority LOW`);
   
    return {
      category: "Other",
      priority: "Low",
      priorityScore: 20,
      severity: "Low",
      confidence: 100,
      analysisReason: `Private property detected: ${privateCheck.type}`,
      categoryCorrected: true,
      originalCategory: reportCategory,
      correctionReason: `Auto-corrected to "Other" - private ${privateCheck.type.toLowerCase()} issue`,
      forcedCorrection: true,
      isPrivateProperty: true,
      privateType: privateCheck.type,
      imageAnalysis: aiImageAnalysis
    };
  }

  // ============================================================
  // STEP 2: ENHANCED CATEGORY CORRECTION (مع دعم تحليل الصور)
  // ============================================================
 
  console.log(`\n🔄 [STEP 2] Checking for category correction...`);
 
  // أولاً: التصحيح بالكلمات المفتاحية
  let correction = correctCategoryByKeywords(title, description, reportCategory);
 
  // ثانياً: إذا وجد تحليل صور بثقة عالية والمشكلة واضحة، نستخدمه (أولوية للصورة على النص)
  if (aiImageAnalysis &&
      aiImageAnalysis.isIssueVisible === true &&
      aiImageAnalysis.detectedCategory &&
      aiImageAnalysis.confidence > 80) {
   
    console.log(`📸 AI IMAGE ANALYSIS OVERRIDE:`);
    console.log(`   Keyword correction: ${correction?.category || "none"}`);
    console.log(`   Image suggests: ${aiImageAnalysis.detectedCategory} (${aiImageAnalysis.confidence}%)`);
    console.log(`   Issue clearly visible in image`);
   
    correction = {
      category: aiImageAnalysis.detectedCategory,
      confidence: aiImageAnalysis.confidence,
      reason: `Detected visually from uploaded image: ${aiImageAnalysis.visualFindings || "visible issue"}`
    };
   
    console.log(`   ✅ Using image-based correction`);
  }
 
  if (correction && CONFIG.CATEGORY_CORRECTION.ENABLED) {
    const isCorrected = (correction.category !== reportCategory);
   
    console.log(`📌 Correction applied:`);
    console.log(`   Original: ${reportCategory}`);
    console.log(`   Corrected to: ${correction.category}`);
    console.log(`   Reason: ${correction.reason}`);
   
    let priority = "Medium";
    let priorityScore = 50;
    let severity = "Moderate";
    const combined = `${title} ${description}`.toLowerCase();
   
    // إذا كان التحليل من الصور وأظهر severity، استخدمه
    if (aiImageAnalysis && aiImageAnalysis.severity) {
      severity = aiImageAnalysis.severity;
      if (severity === "Severe") {
        priority = "High";
        priorityScore = 85;
      } else if (severity === "Moderate" && correction.category === "Traffic Signal") {
        priority = "High";
        priorityScore = 85;
      }
    } else {
      // منطق الأولوية العادي
      if (correction.category === "Traffic Signal" || correction.category === "Flooding/Drainage") {
        priority = "High";
        priorityScore = 85;
        severity = "Severe";
      } else if (correction.category === "Blocked Drain" && combined.includes("emergency")) {
        priority = "High";
        priorityScore = 85;
        severity = "Severe";
      } else if (correction.category === "Road Damage" &&
                 (combined.includes("deep") || combined.includes("dangerous"))) {
        priority = "High";
        priorityScore = 75;
        severity = "Severe";
      }
    }
   
    // تعديل الطقس
    try {
      const weather = await getWeather(lat, lng);
      if (weather && weather !== "Unknown") {
        priority = adjustPriorityByWeather(correction.category, priority, weather);
        console.log(`🌤️ Weather adjustment: ${weather}`);
      }
    } catch (err) {
      console.error("Weather error:", err);
    }
   
    const spamResult = detectSpam({ title, description, category: correction.category });
   
    return {
      category: correction.category,
      priority: priority,
      priorityScore: priorityScore,
      severity: severity,
      confidence: correction.confidence,
      analysisReason: correction.reason,
      categoryCorrected: isCorrected,
      originalCategory: reportCategory,
      correctionReason: isCorrected ? `Auto-corrected from "${reportCategory}" to "${correction.category}" - ${correction.reason}` : null,
      forcedCorrection: CONFIG.CATEGORY_CORRECTION.FORCE_CORRECTION,
      isPrivateProperty: false,
      imageAnalysis: aiImageAnalysis,
      spamAnalysis: spamResult,
      usedImageAI: !!aiImageAnalysis
    };
  }

  // ============================================================
  // 🆕 STEP 2.5: SKIP FULL AI IF IMAGE ANALYSIS IS STRONG
  // ============================================================
 
  // إذا كان تحليل الصور قوي والمشكلة واضحة، لا تحتاج AI كامل
  if (aiImageAnalysis &&
      aiImageAnalysis.isIssueVisible === true &&
      aiImageAnalysis.confidence > 85) {
   
    console.log(`✅ Strong image analysis detected (confidence: ${aiImageAnalysis.confidence}%) → skipping full AI to save cost`);
   
    const priority = aiImageAnalysis.severity === "Severe" ? "High" : "Medium";
    const priorityScore = aiImageAnalysis.severity === "Severe" ? 85 : 50;
    const severity = aiImageAnalysis.severity || "Moderate";
    const isCorrected = (reportCategory !== aiImageAnalysis.detectedCategory);
   
    const spamResult = detectSpam({
      title,
      description,
      category: aiImageAnalysis.detectedCategory
    });
   
    // تعديل الطقس
    let finalPriority = priority;
    try {
      const weather = await getWeather(lat, lng);
      if (weather && weather !== "Unknown") {
        finalPriority = adjustPriorityByWeather(aiImageAnalysis.detectedCategory, priority, weather);
      }
    } catch (err) {
      console.error("Weather error:", err);
    }
   
    return {
      category: aiImageAnalysis.detectedCategory,
      priority: finalPriority,
      priorityScore: priorityScore,
      severity: severity,
      confidence: aiImageAnalysis.confidence,
      analysisReason: aiImageAnalysis.visualFindings || "Detected from image analysis",
      categoryCorrected: isCorrected,
      originalCategory: reportCategory,
      correctionReason: isCorrected ? `Image AI override: ${aiImageAnalysis.visualFindings}` : null,
      forcedCorrection: true,
      isPrivateProperty: false,
      imageAnalysis: aiImageAnalysis,
      spamAnalysis: spamResult,
      usedImageAI: true,
      skippedFullAI: true // توفير التكاليف
    };
  }

  // ============================================================
  // STEP 3: FULL AI ANALYSIS (للحالات المعقدة فقط)
  // ============================================================
 
  console.log(`\n🤖 [STEP 3] Running full AI analysis (complex case)...`);

  const imageParts = await processImages(mediaUrls);
 
  // بناء prompt محسن مع نتائج تحليل الصور السريع إن وجد
  let imageContextText = "";
  if (aiImageAnalysis && aiImageAnalysis.visualFindings) {
    imageContextText = `
PREVIOUS IMAGE ANALYSIS (already detected):
- Category: ${aiImageAnalysis.detectedCategory}
- Findings: ${aiImageAnalysis.visualFindings}
- Confidence: ${aiImageAnalysis.confidence}%
- Issue clearly visible: ${aiImageAnalysis.isIssueVisible}

Use this as a starting point and refine if needed.
`;
  }
 
  const prompt = `
You are a GOVERNMENT AI SYSTEM for infrastructure analysis in Oman.
Return ONLY JSON.

${imageContextText}

CATEGORIES: ${CATEGORIES.join(", ")}

IMPORTANT RULES:
- The user-selected category may be WRONG. Analyze carefully.
- If images are provided, PRIORITIZE VISUAL EVIDENCE over weak text.
- Waste Management = garbage, trash, waste bins, cleanliness
- Public Facility Damage = parks, public buildings, mosques, schools, hospitals
- Road Damage = potholes, cracks, broken pavement
- Blocked Drain = clogged manholes, blocked sewage

PRIORITY RULES:
- High: Emergency, safety hazard, active flooding, major road damage
- Medium: Street lighting, waste management, blocked drains
- Low: Private property, cosmetic issues

TITLE: ${title}
DESCRIPTION: ${description}
IMAGES: ${mediaUrls.length} image(s)
USER SELECTED: ${reportCategory || "Not specified"}

OUTPUT:
{
  "category": "one of the categories",
  "priority": "High/Medium/Low",
  "priorityScore": 0-100,
  "severity": "Low/Moderate/Severe",
  "confidence": 0-100,
  "analysisReason": "brief explanation"
}`;

  const contents = [{ parts: [{ text: prompt }, ...imageParts] }];
  let aiResponse = await callModel("gemini-1.5-flash", contents, API_KEY);

  if (!aiResponse) {
    const spamResult = detectSpam({ title, description, category: reportCategory });
   
    return {
      category: reportCategory || "Other",
      priority: "Medium",
      priorityScore: 50,
      severity: "Moderate",
      confidence: 50,
      analysisReason: "AI analysis unavailable, using user selection",
      categoryCorrected: false,
      originalCategory: reportCategory,
      correctionReason: null,
      forcedCorrection: false,
      isPrivateProperty: false,
      imageAnalysis: aiImageAnalysis,
      spamAnalysis: spamResult
    };
  }

  let finalCategory = CATEGORIES.includes(aiResponse.category) ? aiResponse.category : "Other";
  let categoryCorrected = (reportCategory && finalCategory !== reportCategory);
  let correctionReason = categoryCorrected ? aiResponse.analysisReason || `AI analysis determined this is a ${finalCategory} issue` : null;

  // تأكيد نهائي بالصور (أولوية قصوى)
  if (aiImageAnalysis &&
      aiImageAnalysis.isIssueVisible === true &&
      aiImageAnalysis.detectedCategory &&
      aiImageAnalysis.confidence > 85 &&
      finalCategory !== aiImageAnalysis.detectedCategory) {
   
    console.log(`🔨 FINAL CHECK OVERRIDE: AI said "${finalCategory}" → Corrected to "${aiImageAnalysis.detectedCategory}" based on strong image evidence`);
    finalCategory = aiImageAnalysis.detectedCategory;
    categoryCorrected = true;
    correctionReason = `Image analysis override: ${aiImageAnalysis.visualFindings}`;
  }
 
  // تأكيد نهائي بالكلمات المفتاحية
  const finalKeywordCheck = correctCategoryByKeywords(title, description, reportCategory);
  if (finalKeywordCheck && finalKeywordCheck.category !== finalCategory && finalKeywordCheck.confidence > 90) {
    console.log(`🔨 FINAL CHECK OVERRIDE: AI said "${finalCategory}" → Corrected to "${finalKeywordCheck.category}" based on keywords`);
    finalCategory = finalKeywordCheck.category;
    categoryCorrected = true;
    correctionReason = finalKeywordCheck.reason;
  }

  // تعديل الطقس
  try {
    const weather = await getWeather(lat, lng);
    if (weather && weather !== "Unknown") {
      const oldPriority = aiResponse.priority;
      aiResponse.priority = adjustPriorityByWeather(finalCategory, aiResponse.priority, weather);
      if (oldPriority !== aiResponse.priority) {
        console.log(`🌤️ Weather adjustment: ${oldPriority} → ${aiResponse.priority} (${weather})`);
      }
      aiResponse.weather = weather;
    }
  } catch (err) {
    console.error("Weather error:", err);
  }

  const spamResult = detectSpam({ title, description, category: finalCategory });

  console.log(`\n📊 ===== FINAL ANALYSIS RESULT =====`);
  console.log(`📝 User selected: ${reportCategory || "not specified"}`);
  console.log(`🖼️ Image analysis: ${aiImageAnalysis?.detectedCategory || "none"}`);
  console.log(`🤖 Final category: ${finalCategory}`);
  console.log(`✅ Corrected: ${categoryCorrected ? "YES" : "NO"}`);
  if (categoryCorrected) console.log(`📌 Reason: ${correctionReason}`);
  console.log(`================================\n`);

  return {
    category: finalCategory,
    priority: aiResponse.priority || "Medium",
    priorityScore: aiResponse.priorityScore || 50,
    severity: aiResponse.severity || "Moderate",
    confidence: aiResponse.confidence || 85,
    analysisReason: aiResponse.analysisReason || "AI analysis completed",
    categoryCorrected: categoryCorrected,
    originalCategory: reportCategory,
    correctionReason: correctionReason,
    forcedCorrection: false,
    isPrivateProperty: false,
    weather: aiResponse.weather,
    imageAnalysis: aiImageAnalysis,
    spamAnalysis: spamResult,
    usedImageAI: !!aiImageAnalysis,
    skippedFullAI: false
  };
}

/* ------------------------------------------------------------------ */
/*  🔄 13. دمج النتائج                                               */
/* ------------------------------------------------------------------ */

export function combineAIWithSpam(spamResult, aiResult) {
  if (!aiResult) return { ...spamResult, aiEnhanced: false };

  const sharedAIFields = {
    aiEnhanced: true,
    aiConfidence: aiResult.confidence,
    aiPriority: aiResult.priority,
    aiCategory: aiResult.category,
    isPrivateProperty: aiResult.isPrivateProperty || false,
    privateType: aiResult.privateType,
    categoryCorrected: aiResult.categoryCorrected || false,
    originalCategory: aiResult.originalCategory,
    correctionReason: aiResult.correctionReason,
    forcedCorrection: aiResult.forcedCorrection || false,
    usedImageAI: aiResult.usedImageAI || false,
    skippedFullAI: aiResult.skippedFullAI || false,
    imageAnalysis: aiResult.imageAnalysis
  };

  if (aiResult.isPrivateProperty) {
    const score = spamResult.spamScore;
    return {
      ...spamResult,
      ...sharedAIFields,
      aiPriority: "Low",
      isSpam: score >= CONFIG.SPAM_HIGH,
      spamLevel: score >= CONFIG.SPAM_HIGH ? "High" : score >= CONFIG.SPAM_MEDIUM ? "Medium" : "Low",
    };
  }

  let score = spamResult.spamScore;
  if (aiResult.confidence < 40) score += 10;
  else if (aiResult.confidence > 75) score -= 10;
  if (aiResult.priority === "High") score -= 8;
  else if (aiResult.priority === "Low") score += 5;
 
  // إذا استخدم تحليل الصور وكانت الثقة عالية، تقليل سكور السبام
  if (aiResult.usedImageAI && aiResult.imageAnalysis?.confidence > 80) {
    score -= 10;
  }
 
  // إذا تخطى الـ Full AI (توفير تكاليف) لا تؤثر على السكور
  if (aiResult.skippedFullAI) {
    console.log(`💰 Cost saved: Skipped full AI analysis`);
  }
 
  score = Math.max(0, Math.min(100, score));

  return {
    ...spamResult,
    ...sharedAIFields,
    spamScore: score,
    isSpam: score >= CONFIG.SPAM_HIGH,
    spamLevel: score >= CONFIG.SPAM_HIGH ? "High" : score >= CONFIG.SPAM_MEDIUM ? "Medium" : "Low",
  };
}

/* ------------------------------------------------------------------ */
/*  📤 14. التصدير                                                   */
/* ------------------------------------------------------------------ */

export default {
  analyzeReport,
  detectSpam,
  combineAIWithSpam,
  getSpamBadgeInfo,
  generateUserRecommendation,
  generateShortUserMessage,
  CONFIG,
  CATEGORIES,
};
