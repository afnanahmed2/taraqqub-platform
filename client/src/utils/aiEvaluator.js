// utils/aiEvaluator.js
// ✅ نظام تقييم وتحسين الذكاء الاصطناعي

/**
 * تقييم دقة AI بناءً على فيدباك المستخدم
 * @param {Object} aiResult - نتيجة تحليل AI (category, priority, confidence)
 * @param {Object} feedback - فيدباك المستخدم (rating, message)
 * @param {Object} actualOutcome - النتيجة الفعلية من الأدمن (اختياري)
 * @returns {Object} نتيجة التقييم
 */
export function evaluateAIAccuracy(aiResult, feedback, actualOutcome = null) {
  if (!aiResult || !feedback) {
    return { wasCorrect: false, error: "Missing data" };
  }

  let wasCorrect = false;
  let reason = "";

  // معايير التقييم بناءً على تقييم المستخدم
  if (feedback.rating >= 4) {
    wasCorrect = true;
    reason = "User confirmed with high rating";
  } else if (feedback.rating <= 2) {
    wasCorrect = false;
    reason = "User rejected with low rating";
  } else {
    // 3 نجوم = محايد، لا يُحتسب
    return { wasCorrect: null, reason: "Neutral rating - not counted", confidence: aiResult.confidence };
  }

  // ✅ إذا كانت نتيجة الأدمن متاحة، نستخدمها بدل تقييم المستخدم
  if (actualOutcome) {
    const categoryMatch = aiResult.category === actualOutcome.category;
    const priorityMatch = aiResult.priority === actualOutcome.priority;
    wasCorrect = categoryMatch && priorityMatch;
    reason = wasCorrect
      ? "AI prediction matched admin outcome"
      : "AI prediction did not match admin outcome";
  }

  // تحذير تلقائي عند انخفاض الثقة
  if (aiResult.confidence < 50) {
    console.warn("⚠️ Low confidence prediction:", aiResult.confidence + "%");
  }

  return {
    wasCorrect,
    reason,
    confidence: aiResult.confidence || 0,
    aiCategory: aiResult.category,
    aiPriority: aiResult.priority,
    userRating: feedback.rating,
    timestamp: new Date().toISOString()
  };
}

/**
 * حساب دقة AI الإجمالية من مصفوفة تقييمات
 * @param {Array} evaluations
 * @returns {Object} إحصائيات الدقة
 */
export function calculateAIAccuracy(evaluations) {
  const validEvaluations = evaluations.filter(e => e.wasCorrect !== null);
  const total = validEvaluations.length;
  const correct = validEvaluations.filter(e => e.wasCorrect === true).length;

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 72; // 72% افتراضي إذا لا يوجد بيانات

  const highConfidenceTotal = evaluations.filter(e => e.confidence >= 70).length;
  const highConfidenceCorrect = evaluations.filter(e => e.confidence >= 70 && e.wasCorrect === true).length;
  const highConfidenceAccuracy = highConfidenceTotal > 0
    ? Math.round((highConfidenceCorrect / highConfidenceTotal) * 100)
    : 0;

  const lowConfidenceTotal = evaluations.filter(e => e.confidence < 50).length;
  const lowConfidenceCorrect = evaluations.filter(e => e.confidence < 50 && e.wasCorrect === true).length;
  const lowConfidenceAccuracy = lowConfidenceTotal > 0
    ? Math.round((lowConfidenceCorrect / lowConfidenceTotal) * 100)
    : 0;

  return {
    accuracy,
    totalEvaluations: total,
    correctPredictions: correct,
    highConfidenceAccuracy,
    lowConfidenceAccuracy,
    needsImprovement: accuracy < 75,
    recommendation: accuracy < 75
      ? "AI model needs retraining with more data"
      : "AI performance is satisfactory"
  };
}

/**
 * تسجيل حالات التحسين المطلوبة (Continuous Improvement System)
 * @param {Object} evaluation - نتيجة التقييم
 */
export function logAIImprovement(evaluation) {
  if (evaluation.wasCorrect === false) {
    console.log("🔍 AI Improvement Needed:");
    console.log("   - Category:", evaluation.aiCategory);
    console.log("   - Priority:", evaluation.aiPriority);
    console.log("   - Confidence:", evaluation.confidence + "%");
    console.log("   - User Rating:", evaluation.userRating + "/5");
    console.log("   - Reason:", evaluation.reason);

    // 📌 هنا يمكن إرسال البيانات للخادم لتحسين النموذج
    // sendToTrainingDataset(evaluation);
  } else if (evaluation.wasCorrect === true && evaluation.confidence < 60) {
    console.log("✅ Good prediction despite low confidence:", evaluation.confidence + "%");
  }
}