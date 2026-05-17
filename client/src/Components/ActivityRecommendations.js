// src/components/ActivityRecommendations.js
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ✅ أيقونات الأنشطة
const ACTIVITY_ICONS = {
  "طلعة برية": "🏕️",
  "رياضة خارجية": "🏃",
  "رحلة بحرية": "⛵",
  "فعاليات عائلية": "👨‍👩‍👧",
  "تخييم": "🌙",
  "صيد": "🎣",
  "مشي وتنزه": "🚶",
  "ركوب الخيل": "🐴",
  "رياضة صباحية": "🌅",
  "تسوق وترفيه داخلي": "🛒",
};

const fallbackIcon = "📌";

// ✅ التصنيفات الجديدة: Excellent, Very Good, Good, Bad
// مع الألوان المناسبة لكل تصنيف
const statusConfig = {
  "Excellent": { color: "#06d6a0", bg: "rgba(6,214,160,0.15)", barColor: "#06d6a0" },
  "Very Good": { color: "#48CAE4", bg: "rgba(72,202,228,0.15)", barColor: "#48CAE4" },
  "Good": { color: "#FFD166", bg: "rgba(255,209,102,0.15)", barColor: "#FFD166" },
  "Bad": { color: "#EF476F", bg: "rgba(239,71,111,0.15)", barColor: "#EF476F" },
};

const ActivityRecommendations = ({ weatherData }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!weatherData || hasFetched.current) return;
    hasFetched.current = true;
    fetchRecommendations();
  }, [weatherData]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    setSelected(null);

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "صباح" : hour < 17 ? "ظهر/عصر" : "مساء";

    // ✅ تم تعديل الـ prompt لاستخدام التصنيفات الجديدة: Excellent, Very Good, Good, Bad
    const prompt = `
أنت مستشار أنشطة خارجية في عُمان. بناءً على بيانات الطقس التالية، قيّم مدى ملاءمة كل نشاط.

⚠️ مهم جداً: استخدم التصنيفات التالية فقط باللغة الإنجليزية:
- Excellent (ممتاز جداً)
- Very Good (جيد جداً)
- Good (جيد)
- Bad (غير مناسب)

بيانات الطقس:
- درجة الحرارة: ${weatherData.main.temp}°C (تبدو كـ: ${weatherData.main.feels_like}°C)
- الرطوبة: ${weatherData.main.humidity}%
- سرعة الرياح: ${(weatherData.wind.speed * 3.6).toFixed(1)} كم/س
- الحالة: ${weatherData.weather[0].description}
- هطول أمطار: ${weatherData.rain?.["1h"] ?? 0} مم
- وقت اليوم: ${timeOfDay}
- الموقع: ${weatherData.name}, عُمان

أجب بصيغة JSON فقط، مصفوفة من 6 عناصر، كل عنصر يحتوي:
[
  {
    "name": "اسم النشاط بالعربية من هذه القائمة فقط: طلعة برية | رياضة خارجية | رحلة بحرية | فعاليات عائلية | تخييم | صيد | مشي وتنزه | ركوب الخيل | رياضة صباحية | تسوق وترفيه داخلي",
    "status": "Excellent | Very Good | Good | Bad",
    "score": "رقم من 0 إلى 100 (100 يعني مثالي للطقس)",
    "best_time": "أفضل وقت اليوم لهذا النشاط (كلمتان بالعربية مثل 'الصباح الباكر' أو 'بعد الغروب')",
    "tip": "نصيحة عملية مختصرة جداً بالعربية (10 كلمات كحد أقصى)",
    "reason": "سبب التقييم بالعربية (جملة واحدة قصيرة)"
  }
]

💡 أمثلة لتقييم صحيح:
- إذا كانت الحرارة 45°C والرطوبة 80%: نشاط "رياضة خارجية" → status: "Bad"
- إذا كانت الحرارة 25°C والجو صافي: نشاط "طلعة برية" → status: "Excellent"
- إذا كانت الحرارة 32°C مع رياح خفيفة: نشاط "تخييم" → status: "Very Good"
- إذا كانت الحرارة 35°C: نشاط "رياضة صباحية" → status: "Good" (مع نصيحة بالذهاب صباحاً)

تأكد من أن التقييم يعتمد على الطقس الحالي فقط، وليس على افتراضات عامة.
`;

    try {
      // ✅ الاتصال بالخادم الخلفي
      const response = await fetch("http://localhost:3001/api/anthropic/activity-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1200,
          temperature: 0.7, // إضافة القليل من العشوائية للحصول على توصيات متنوعة
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      
      let parsed;
      try {
        parsed = JSON.parse(clean);
        // التأكد من أن النتيجة هي مصفوفة
        if (!Array.isArray(parsed)) {
          throw new Error("Response is not an array");
        }
      } catch (e) {
        console.error("JSON parse error:", e);
        // ✅ بيانات احتياطية باستخدام التصنيفات الجديدة
        parsed = generateFallbackActivities(weatherData, timeOfDay);
      }
      
      setActivities(parsed.slice(0, 6));
      
    } catch (err) {
      console.error("Recommendations error:", err);
      setError("تعذّر تحميل التوصيات. سيتم استخدام توصيات ذكية مؤقتة.");
      // استخدام البيانات الاحتياطية الذكية
      const fallback = generateFallbackActivities(weatherData, timeOfDay);
      setActivities(fallback);
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة مساعدة لتوليد توصيات احتياطية ذكية (بدون AI) باستخدام التصنيفات الجديدة
  const generateFallbackActivities = (weather, time) => {
    if (!weather) return [];
    
    const temp = weather.main.temp;
    const wind = (weather.wind.speed * 3.6);
    const rain = weather.rain?.["1h"] ?? 0;
    const humidity = weather.main.humidity;
    
    const isHot = temp >= 38;
    const isVeryHot = temp >= 42;
    const isWindy = wind >= 30;
    const isRaining = rain > 0;
    const isHighHumidity = humidity > 75;
    const isMorning = time === "صباح";
    const isEvening = time === "مساء";
    const isPerfect = temp >= 20 && temp < 32 && !isWindy && !isRaining;
    
    return [
      {
        name: isVeryHot ? "تسوق وترفيه داخلي" : (isHot ? "تخييم" : "طلعة برية"),
        status: isVeryHot ? "Excellent" : (isHot ? "Good" : (isPerfect ? "Excellent" : "Very Good")),
        score: isVeryHot ? 95 : (isHot ? 70 : (isPerfect ? 98 : 85)),
        best_time: isHot ? "المساء" : (isMorning ? "الصباح" : "أي وقت"),
        tip: isVeryHot ? "ابق في الداخل وتكييف" : (isHot ? "تجنب الظهيرة" : (isRaining ? "خذ مظلة" : "استمتع بالخارج")),
        reason: isVeryHot ? "الحرارة شديدة جداً، الأنشطة الداخلية أفضل" : (isHot ? "الجو حار لكن مقبول مع الاحتياطات" : "الطقس مناسب جداً للخارج")
      },
      {
        name: isRaining ? "تسوق وترفيه داخلي" : (isWindy ? "رياضة صباحية" : "رياضة خارجية"),
        status: isRaining ? "Excellent" : (isWindy ? "Good" : (isPerfect ? "Excellent" : "Very Good")),
        score: isRaining ? 90 : (isWindy ? 60 : (isPerfect ? 95 : 80)),
        best_time: isMorning ? "الصباح" : "قبل الغروب",
        tip: isRaining ? "ابق في الداخل" : (isWindy ? "احترس من الرياح" : "احمل ماء"),
        reason: isRaining ? "هطول أمطار يمنع الرياضة الخارجية" : (isWindy ? "الرياح تؤثر على الأداء" : "درجة حرارة مناسبة للرياضة")
      },
      {
        name: (isRaining || isWindy) ? "تسوق وترفيه داخلي" : "رحلة بحرية",
        status: (isRaining || isWindy) ? "Bad" : (isHot ? "Good" : (isPerfect ? "Excellent" : "Very Good")),
        score: (isRaining || isWindy) ? 30 : (isHot ? 65 : (isPerfect ? 95 : 85)),
        best_time: isEvening ? "المساء" : "الظهر",
        tip: (isRaining || isWindy) ? "الطقس غير آمن للبحر" : (isHot ? "اختر وقت الغروب" : "بحر هادئ ومناسب"),
        reason: (isRaining || isWindy) ? "ظروف البحر غير مستقرة وخطيرة" : (isHot ? "الحرارة مرتفعة لكن البحر بارد" : "ظروف مثالية للإبحار")
      },
      {
        name: isVeryHot ? "تسوق وترفيه داخلي" : "فعاليات عائلية",
        status: isVeryHot ? "Excellent" : (isHot ? "Good" : (isPerfect ? "Excellent" : "Very Good")),
        score: isVeryHot ? 95 : (isHot ? 70 : (isPerfect ? 96 : 84)),
        best_time: isHot ? "بعد الغروب" : (isMorning ? "الصباح" : "أي وقت"),
        tip: isHot ? "اختر مكاناً مظللاً" : (isHighHumidity ? "احضر ماء إضافي" : "وقت ممتع للعائلة"),
        reason: isVeryHot ? "الحرارة شديدة، الأماكن المكيفة أفضل" : (isHot ? "الجو حار لكن يمكن التكيف معه" : "ظروف ممتازة للتجمعات العائلية")
      },
      {
        name: "مشي وتنزه",
        status: (isVeryHot || isRaining) ? "Bad" : (isHot ? "Good" : (isPerfect ? "Excellent" : "Very Good")),
        score: (isVeryHot || isRaining) ? 35 : (isHot ? 70 : (isPerfect ? 98 : 85)),
        best_time: isHot ? "الصباح الباكر أو المساء" : (isMorning ? "الصباح" : "أي وقت"),
        tip: isHot ? "اختر وقتاً باراً" : (isRaining ? "استخدم مظلة" : "استمتع بالطبيعة"),
        reason: isVeryHot ? "الجو حار جداً للمشي الطويل" : (isHot ? "الجو حار لكن المشي القصير ممكن" : "طقس رائع للمشي والتنزه")
      },
      {
        name: isHot ? "تسوق وترفيه داخلي" : "تخييم",
        status: isVeryHot ? "Excellent" : (isHot ? "Very Good" : (isPerfect ? "Excellent" : "Good")),
        score: isVeryHot ? 95 : (isHot ? 85 : (isPerfect ? 96 : 75)),
        best_time: isHot ? "المساء" : "الليل",
        tip: isHot ? "اختر مكاناً مكيفاً" : (isWindy ? "ثبّت الخيمة جيداً" : "استمتع بالأجواء"),
        reason: isVeryHot ? "الحرارة الشديدة تتطلب مكيف" : (isHot ? "الحرارة مرتفعة لكن الليل مناسب" : "ظروف ممتازة للتخييم")
      }
    ];
  };

  return (
    <div className="activity-recommendations">
      <style>{`
        .activity-recommendations {
          margin: 16px 0;
        }
        .act-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .act-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .act-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          margin-top: 4px;
        }
        .act-refresh-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 6px 12px;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .act-refresh-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .act-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .act-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .act-grid {
            grid-template-columns: 1fr;
          }
        }
        .act-card {
          position: relative;
          border-radius: 16px;
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.15);
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .act-card:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-4px);
        }
        .act-card.selected {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.4);
        }
        .act-card-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .act-card-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          margin-bottom: 8px;
        }
        .act-status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          margin-bottom: 8px;
        }
        .act-score-bar-bg {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .act-score-bar {
          height: 100%;
          border-radius: 2px;
        }
        .act-best-time {
          font-size: 11px;
          color: rgba(255,255,255,0.65);
        }
        .act-detail-panel {
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          padding: 16px;
          margin-top: 16px;
        }
        .act-detail-name {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .act-detail-reason {
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          margin-bottom: 12px;
        }
        .act-detail-tip {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.05);
          padding: 10px;
          border-radius: 8px;
        }
        .act-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .act-skeleton-card {
          height: 110px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%);
          background-size: 200% 100%;
          animation: shimmer2 1.5s infinite;
        }
        @keyframes shimmer2 {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .act-error {
          color: #EF476F;
          font-size: 13px;
          text-align: center;
          padding: 10px 0;
        }
      `}</style>

      <div className="act-header">
        <div>
          <div className="act-title">
            <span>🗓️</span>
            توصيات النشاطات
          </div>
          <div className="act-subtitle">مبنية على طقس اليوم بالذكاء الاصطناعي</div>
        </div>
        <button className="act-refresh-btn" onClick={() => { hasFetched.current = false; fetchRecommendations(); }} disabled={loading}>
          {loading ? "..." : "🔄 تحديث"}
        </button>
      </div>

      {loading && (
        <div className="act-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="act-skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {error && <div className="act-error">{error}</div>}

      {!loading && !error && activities.length > 0 && (
        <>
          <div className="act-grid">
            {activities.map((act, i) => {
              // ✅ استخدام statusConfig الجديد مع التصنيفات: Excellent, Very Good, Good, Bad
              const cfg = statusConfig[act.status] || statusConfig["Good"];
              const icon = ACTIVITY_ICONS[act.name] || fallbackIcon;
              const isSelected = selected?.name === act.name;
              return (
                <motion.div
                  key={i}
                  className={`act-card ${isSelected ? "selected" : ""}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 220 }}
                  onClick={() => setSelected(isSelected ? null : act)}
                  style={{ borderColor: isSelected ? cfg.color + "66" : undefined }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cfg.barColor, borderRadius: "16px 16px 0 0", opacity: 0.7 }} />
                  <div className="act-card-icon">{icon}</div>
                  <div className="act-card-name">{act.name}</div>
                  <div className="act-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
                    {act.status}
                  </div>
                  <div className="act-score-bar-bg">
                    <motion.div
                      className="act-score-bar"
                      style={{ background: cfg.barColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${act.score}%` }}
                      transition={{ delay: i * 0.07 + 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="act-best-time">🕐 {act.best_time}</div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div
                className="act-detail-panel"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="act-detail-name">
                  <span>{ACTIVITY_ICONS[selected.name] || fallbackIcon}</span>
                  {selected.name}
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: (statusConfig[selected.status]?.bg || "rgba(255,255,255,0.1)"),
                    color: (statusConfig[selected.status]?.color || "#fff"),
                    fontWeight: 700,
                  }}>
                    {selected.status} — {selected.score}%
                  </span>
                </div>
                <div className="act-detail-reason">{selected.reason}</div>
                <div className="act-detail-tip">
                  <span>💡</span>
                  <span>{selected.tip}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default ActivityRecommendations;