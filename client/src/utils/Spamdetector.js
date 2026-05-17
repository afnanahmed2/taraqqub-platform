// utils/spamDetector.js
// ✅ Advanced Spam Detection System - Final Version
// Hybrid Rule-Based + AI-Assisted Moderation System

/* ------------------------------------------------------------------ */
/*  ⚙️ Configuration - Easy tuning without changing core logic       */
/* ------------------------------------------------------------------ */

const CONFIG = {
  // Thresholds
  SPAM_HIGH: 70,
  SPAM_MEDIUM: 40,
  
  // Weights - Adjustable based on real data
  WEIGHTS: {
    SHORT_TITLE: 15,
    SHORT_DESC: 15,
    SPAM_WORD: 8,
    REPEATED_CHARS: 12,
    DUPLICATE_TITLE_DESC: 18,
    NUMERIC_TITLE: 25,
    LOW_VOCAB: 12,
    VAGUE_OTHER: 10,
    
    // Positive weights (reduce spam score)
    LEGIT_WORD: 6,
    CATEGORY_MATCH: 7,
    DETAILED_DESC: -15,
    LOCATION_PROVIDED: -8,
  },
  
  // Context-Aware Settings
  CONTEXT: {
    ENABLED: true,
    MIN_WORDS_FOR_CONTEXT: 5,
  }
};

/* ------------------------------------------------------------------ */
/*  🔤 Normalization Helper                                           */
/* ------------------------------------------------------------------ */

function normalize(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, '');
}

/* ------------------------------------------------------------------ */
/*  📚 Keywords (Optimized)                                           */
/* ------------------------------------------------------------------ */

// Light spam keywords - reduced weight to avoid false positives
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
];

const CATEGORY_KEYWORDS = {
  "Road Damage": ["road", "pothole", "crack", "asphalt", "pavement"],
  "Flooding/Drainage": ["flood", "water", "drain", "overflow"],
  "Blocked Drain": ["drain", "blocked", "clogged"],
  "Street Lighting": ["light", "lamp", "dark", "bulb"],
  "Traffic Signal": ["signal", "traffic", "intersection"],
  "Waste Management": ["waste", "garbage", "trash"],
  "Public Facility Damage": ["facility", "park", "wall", "building"],
  "Other": [],
};

/* ------------------------------------------------------------------ */
/*  🔧 Helper Functions                                               */
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

// Context-Aware Detection
function hasContext(report, legitMatches) {
  if (!CONFIG.CONTEXT.ENABLED) return false;
  
  const { title, description } = report;
  const combined = `${title} ${description}`;
  const wordCount = combined.split(/\s+/).length;
  
  const hasLightSpam = filterKeywords(combined, SPAM_KEYWORDS_LIGHT).length > 0;
  const hasLegitWords = legitMatches.length > 0;
  
  // "hey road broken" = valid context
  return hasLightSpam && hasLegitWords && wordCount >= CONFIG.CONTEXT.MIN_WORDS_FOR_CONTEXT;
}

/* ------------------------------------------------------------------ */
/*  🧠 Main Detection Function (Fully Enhanced)                       */
/* ------------------------------------------------------------------ */

export function detectSpam(report = {}) {
  const title = normalize(report.title || "");
  const description = normalize(report.description || "");
  const category = report.category || "";
  const location = normalize(report.location || "");

  const combined = `${title} ${description}`;

  // Empty report protection
  if (!combined.trim()) {
    return {
      spamScore: 100,
      spamLevel: "High",
      isSpam: true,
      color: "#E63946",
      reasons: ["⚠️ Report is completely empty"],
      positives: [],
      suggestion: "⚠️ Please provide a clear description of the issue",
      metadata: { wordCount: 0, uniqueRatio: 0, legitMatches: 0, contextDetected: false }
    };
  }

  let spamScore = 0;
  const reasons = [];
  const positives = [];

  /* ---------- 🚫 Raise Spam Score ---------- */

  if (title.replace(/\s/g, "").length < 5) {
    spamScore += CONFIG.WEIGHTS.SHORT_TITLE;
    reasons.push("⚠️ Title is too short");
  }

  if (description.replace(/\s/g, "").length < 20) {
    spamScore += CONFIG.WEIGHTS.SHORT_DESC;
    reasons.push("⚠️ Description is too short");
  }

  const heavySpamMatches = filterKeywords(combined, SPAM_KEYWORDS_HEAVY);
  if (heavySpamMatches.length) {
    spamScore += Math.min(heavySpamMatches.length * CONFIG.WEIGHTS.SPAM_WORD, 35);
    reasons.push(`🚫 Suspicious words: ${heavySpamMatches.slice(0, 2).join(', ')}`);
  }

  if (/(.)\1{4,}/.test(combined)) {
    spamScore += CONFIG.WEIGHTS.REPEATED_CHARS;
    reasons.push("⚠️ Excessive character repetition");
  }

  if (normalize(title) === normalize(description) && title.length > 0) {
    spamScore += CONFIG.WEIGHTS.DUPLICATE_TITLE_DESC;
    reasons.push("⚠️ Title matches description exactly");
  }

  if (/^\d+$/.test(title)) {
    spamScore += CONFIG.WEIGHTS.NUMERIC_TITLE;
    reasons.push("⚠️ Title contains only numbers");
  }

  const words = combined.split(/\s+/).filter(w => w.length > 2);
  const uniqueRatio = words.length > 0 ? new Set(words).size / words.length : 1;
  if (uniqueRatio < 0.35 && words.length > 10) {
    spamScore += CONFIG.WEIGHTS.LOW_VOCAB;
    reasons.push("⚠️ Excessive word repetition");
  }

  /* ---------- ✅ Reduce Spam Score ---------- */

  const legitMatches = filterKeywords(combined, LEGITIMATE_KEYWORDS);
  const legitCount = legitMatches.length;

  if (legitCount >= 2) {
    const reduction = Math.min(legitCount * CONFIG.WEIGHTS.LEGIT_WORD, 25);
    spamScore -= reduction;
    positives.push(`✅ Relevant keywords: ${legitMatches.slice(0, 3).join(', ')}`);
  }

  if (category && CATEGORY_KEYWORDS[category]) {
    const matches = filterKeywords(combined, CATEGORY_KEYWORDS[category]);
    if (matches.length > 0) {
      spamScore -= matches.length * CONFIG.WEIGHTS.CATEGORY_MATCH;
      positives.push(`✅ Matches category: ${category}`);
    }
  }

  const contextDetected = hasContext(report, legitMatches);
  if (contextDetected) {
    spamScore -= 10;
    positives.push("🎯 Real context detected for this report");
  }

  if (description.length > 60) {
    spamScore += CONFIG.WEIGHTS.DETAILED_DESC;
    positives.push("✅ Detailed description");
  }

  if (location && location.length > 3) {
    spamScore += CONFIG.WEIGHTS.LOCATION_PROVIDED;
    positives.push("📍 Location provided");
  }

  /* ---------- 📊 Final Score ---------- */

  spamScore = Math.max(0, Math.min(100, spamScore));

  const uniqueReasons = [...new Set(reasons)];
  const uniquePositives = [...new Set(positives)];

  let spamLevel, isSpam, color, suggestion;

  if (spamScore >= CONFIG.SPAM_HIGH) {
    spamLevel = "High";
    isSpam = true;
    color = "#E63946";
    suggestion = "🚫 This report appears to be spam. Please provide real details about an actual issue.";
  } else if (spamScore >= CONFIG.SPAM_MEDIUM) {
    spamLevel = "Medium";
    isSpam = false;
    color = "#FF9F1C";
    suggestion = "📝 Your report lacks some details. Adding more information (location, clearer description) will help process it faster.";
  } else {
    spamLevel = "Low";
    isSpam = false;
    color = "#28a745";
    suggestion = "✅ Good quality report. Thank you for helping improve our services!";
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
/*  🎨 Badge Helper                                                   */
/* ------------------------------------------------------------------ */

export function getSpamBadgeInfo(score = 0) {
  if (score >= CONFIG.SPAM_HIGH) { 
    return { 
      label: "🚫 Spam", 
      bg: "#E63946", 
      color: "#fff",
      level: "high",
      action: "requires_review"
    };
  }
  if (score >= CONFIG.SPAM_MEDIUM) { 
    return { 
      label: "⚠️ Suspicious", 
      bg: "#FF9F1C", 
      color: "#333",
      level: "medium",
      action: "needs_attention"
    };
  }
  return { 
    label: "Valied", 
    bg: "#28a745", 
    color: "#fff",
    level: "low",
    action: "auto_approve"
  };
}

/* ------------------------------------------------------------------ */
/*  🤖 AI Integration (Enhanced)                                      */
/* ------------------------------------------------------------------ */

export function combineAIWithSpam(spamResult, aiResult) {
  if (!aiResult) return { ...spamResult, aiEnhanced: false };

  let score = spamResult.spamScore;

  // AI confidence adjustment
  if (aiResult.confidence < 40) {
    score += 10;
  } else if (aiResult.confidence > 75) {
    score -= 10;
  }

  // Priority adjustment
  if (aiResult.priority === "High") {
    score -= 8;
  } else if (aiResult.priority === "Low") {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    ...spamResult,
    spamScore: score,
    isSpam: score >= CONFIG.SPAM_HIGH,
    spamLevel: score >= CONFIG.SPAM_HIGH ? "High" : score >= CONFIG.SPAM_MEDIUM ? "Medium" : "Low",
    aiConfidence: aiResult.confidence,
    aiPriority: aiResult.priority,
    aiCategory: aiResult.category,
    aiEnhanced: true,
  };
}

/* ------------------------------------------------------------------ */
/*  🐛 Debug Helper (Enhanced)                                        */
/* ------------------------------------------------------------------ */

export function debugSpamDetection(report) {
  const result = detectSpam(report);
  console.group("🔍 Spam Detection Debug");
  console.log("📝 Input:", { 
    ...report, 
    description: report.description?.substring(0, 60) + (report.description?.length > 60 ? "..." : "") 
  });
  console.log("📊 Score:", result.spamScore);
  console.log("🏷️ Level:", result.spamLevel);
  console.log("⚠️ Issues:", result.reasons);
  console.log("✅ Strengths:", result.positives);
  console.log("📈 Metadata:", result.metadata);
  console.log("💡 Suggestion:", result.suggestion);
  console.groupEnd();
  return result;
}

/* ------------------------------------------------------------------ */
/*  📊 Adaptive Threshold Helper (For Future Enhancement)             */
/* ------------------------------------------------------------------ */

export function getAdaptiveThreshold(historicalData) {
  // This can be developed later to analyze historical data
  // and automatically adjust thresholds based on False Positives/Negatives
  return CONFIG;
}