// ============================================================
// smartRoute.js - الكود المعدل بالكامل
// ============================================================

const normalizeText = (text = "") =>
  text.toLowerCase().trim();

/* =========================
   🏛️ GOVERNMENT AUTHORITIES
========================= */
const AUTHORITIES = {
  TRANSPORT:    "Ministry of Transport",
  MUNICIPALITY: "Municipality",
  POLICE:       "Royal Oman Police (ROP)",
  AWQAF:        "Ministry of Awqaf",
  GENERAL:      "General Authority"
};

/* =========================
   🧠 CATEGORY ROUTING MAP
========================= */
const CATEGORY_MAP = {
  "road damage":            "TRANSPORT",
  "street lighting":        "MUNICIPALITY",
  "waste management":       "MUNICIPALITY",
  "blocked drain":          "MUNICIPALITY",   // ✅ صح - البلدية
  "flooding/drainage":      "MUNICIPOLITY",   // ✅ صح - البلدية
  "flooding / drainage":    "MUNICIPALITY",
  "flooding":               "MUNICIPALITY",
  "traffic signal":         "POLICE",
  "public facility damage": "MUNICIPALITY"    // ✅ صح - البلدية
};

/* =========================
   🏠 PRIVATE PROPERTY KEYWORDS
========================= */
const PRIVATE_HOUSE_KEYWORDS = [
  "منزل", "بيت", "فيلا", "شقة", "عمارة", "سكن", "ملك خاص",
  "house", "home", "villa", "apartment", "private residence", "my house",
  "our house", "my home", "my villa", "my apartment",
];

const PRIVATE_MOSQUE_INDICATORS = [
  "مول", "فندق", "شركة", "تجاري", "مكتب", "برج", "مبنى", "سوق",
  "بلازا", "مطعم", "مركز تجاري", "كافيه",
  "mall", "hotel", "company", "commercial", "office", "tower",
  "building", "market", "plaza", "restaurant", "center", "centre", "cafe",
];

const PRIVATE_BUSINESS_KEYWORDS = {
  "فندق": "HOTEL",     "hotel":      "HOTEL",
  "شركة": "COMPANY",   "company":    "COMPANY",
  "مول":  "MALL",      "mall":       "MALL",
  "مطعم": "RESTAURANT","restaurant": "RESTAURANT",
  "مصنع": "FACTORY",   "factory":    "FACTORY",
  "كافيه":"CAFE",      "cafe":       "CAFE",
};

/* =========================
   🔍 detectPrivateProperty
========================= */
function detectPrivateProperty(text = "") {
  // 1. House / private residence
  for (const kw of PRIVATE_HOUSE_KEYWORDS) {
    if (text.includes(kw)) {
      return { isPrivate: true, type: "HOUSE", keyword: kw };
    }
  }

  // 2. Mosque - check if it's inside a private location
  const hasMosque =
    text.includes("مسجد") || text.includes("جامع") ||
    text.includes("mosque") || text.includes("masjid");

  if (hasMosque) {
    for (const ind of PRIVATE_MOSQUE_INDICATORS) {
      if (text.includes(ind)) {
        return { isPrivate: true, type: "PRIVATE_MOSQUE", keyword: "mosque", privateLocation: ind };
      }
    }
    // Public mosque — NOT private, goes to AWQAF
    return { isPrivate: false, type: "PUBLIC_MOSQUE", keyword: "mosque" };
  }

  // 3. Private business
  for (const [kw, btype] of Object.entries(PRIVATE_BUSINESS_KEYWORDS)) {
    if (text.includes(kw)) {
      return { isPrivate: true, type: btype, keyword: kw };
    }
  }

  return { isPrivate: false, type: null, keyword: null };
}

/* =========================
   🧠 SMART ROUTING ENGINE - FIXED
========================= */
const smartRouteReport = (category, description = "") => {
  const normalizedCategory = normalizeText(category);
  const text = normalizeText(description);

  // ── Private property detection (runs FIRST) ──
  const privateCheck = detectPrivateProperty(text);

  if (privateCheck.isPrivate) {
    return {
      authority: null,
      authorityKey: null,
      category: normalizedCategory || "unknown",
      priority: "Low",
      isPrivate: true,
      privateType: privateCheck.type,
      privateLocation: privateCheck.privateLocation || null,
      meta: {
        isMosque: privateCheck.type === "PRIVATE_MOSQUE",
        isPrivatePlace: true,
        privateKeyword: privateCheck.keyword,
      }
    };
  }

  // ── ✅ FIX: Public mosque → ONLY for actual mosque issues ──
  // تأكد أن المشكلة فعلاً متعلقة بالمسجد وليس بالوعة جنبه
  const isMosqueIssue = 
    (text.includes("mosque") || text.includes("masjid") || text.includes("مسجد")) &&
    !text.includes("drain") && 
    !text.includes("بالوعة") &&
    !text.includes("sewer") &&
    !text.includes("صرف");

  if (isMosqueIssue) {
    return {
      authority:    AUTHORITIES["AWQAF"],
      authorityKey: "AWQAF",
      category:     normalizedCategory || "unknown",
      priority:     "Medium",
      isPrivate:    false,
      meta: { isMosque: true, isPrivatePlace: false }
    };
  }

  // ── ✅ FIX: Blocked Drain ALWAYS goes to Municipality ──
  // هذا هو التصحيح الأهم
  if (normalizedCategory === "blocked drain") {
    console.log(`📍 Routing Blocked Drain to MUNICIPALITY`);
    return {
      authority:    AUTHORITIES["MUNICIPALITY"],
      authorityKey: "MUNICIPALITY",
      category:     normalizedCategory,
      priority:     "High",
      isPrivate:    false,
      meta: { isMosque: false, isPrivatePlace: false, isDrainIssue: true }
    };
  }

  // ── Flooding also goes to Municipality ──
  if (normalizedCategory === "flooding/drainage" || normalizedCategory === "flooding") {
    return {
      authority:    AUTHORITIES["MUNICIPALITY"],
      authorityKey: "MUNICIPALITY",
      category:     normalizedCategory,
      priority:     "High",
      isPrivate:    false,
      meta: { isFlooding: true }
    };
  }

  // ── Normal routing for other categories ──
  let authorityKey = CATEGORY_MAP[normalizedCategory] || "GENERAL";

  // Traffic signal always police
  if (normalizedCategory === "traffic signal") {
    authorityKey = "POLICE";
  }

  // Unknown category fallback
  if (!Object.keys(CATEGORY_MAP).includes(normalizedCategory)) {
    authorityKey = "GENERAL";
  }

  return {
    authority:    AUTHORITIES[authorityKey],
    authorityKey,
    category:     normalizedCategory || "unknown",
    priority:     "Medium",
    isPrivate:    false,
    meta: {
      isMosque: false,
      isPrivatePlace: false,
    }
  };
};

export { smartRouteReport, detectPrivateProperty };