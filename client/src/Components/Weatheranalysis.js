import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WeatherAnalysis = ({ weatherData, forecast }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!weatherData || hasFetched.current) return;
    hasFetched.current = true;
    fetchAnalysis();
  }, [weatherData]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    const forecastSummary = forecast?.slice(0, 8).map(f => ({
      time: f.dt_txt,
      temp: Math.round(f.main.temp),
      desc: f.weather[0].description,
      rain: Math.round((f.pop ?? 0) * 100),
    })) || [];

    const prompt = `
أنت خبير طقس محترف. حلّل بيانات الطقس التالية وأعطِ تحليلاً شاملاً باللغة العربية.

بيانات الطقس الحالية:
- درجة الحرارة: ${weatherData.main.temp}°C (تبدو كـ: ${weatherData.main.feels_like}°C)
- الحد الأقصى: ${weatherData.main.temp_max}°C / الحد الأدنى: ${weatherData.main.temp_min}°C
- الرطوبة: ${weatherData.main.humidity}%
- سرعة الرياح: ${(weatherData.wind.speed * 3.6).toFixed(1)} كم/س
- الضغط الجوي: ${weatherData.main.pressure} hPa
- الحالة: ${weatherData.weather[0].description}
- هطول الأمطار (آخر ساعة): ${weatherData.rain?.["1h"] ?? 0} مم
- الموقع: ${weatherData.name}, عُمان

توقعات الساعات القادمة:
${forecastSummary.map(f => `- ${f.time}: ${f.temp}°C, ${f.desc}, احتمال مطر ${f.rain}%`).join("\n")}

المطلوب — أجب بصيغة JSON فقط بدون أي كلام إضافي:
{
  "summary": "جملة واحدة تصف الطقس العام",
  "details": "فقرة تحليلية من 3-4 جمل تشرح الوضع الجوي",
  "trend": "توجه الطقس خلال الساعات القادمة (جملتان)",
  "health_advisory": "نصيحة صحية مرتبطة بالطقس (جملة واحدة)",
  "severity": "low | medium | high",
  "severity_reason": "سبب مستوى الخطورة (جملة قصيرة)"
}
`;

    try {
      // ✅ الـ URL الصحيح للخادم
const response = await fetch("http://localhost:3001/api/anthropic/weather-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
let parsed;
try {
  parsed = JSON.parse(clean);
} catch (e) {
  console.error("JSON parse error:", e);
  parsed = {
    summary: "تعذر تحليل البيانات",
    details: "حدث خطأ أثناء تحليل استجابة الذكاء الاصطناعي.",
    trend: "غير متوفر",
    health_advisory: "يرجى المحاولة لاحقًا",
    severity: "low",
    severity_reason: "خطأ في البيانات"
  };
}      setAnalysis(parsed);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("تعذّر تحميل التحليل. تحقق من الاتصال.");
      // Fallback data in case API fails
      setAnalysis({
        summary: "طقس متغير في عُمان",
        details: "توقع تغيرات في درجات الحرارة خلال اليوم. احرص على متابعة التحديثات.",
        trend: "استقرار نسبي مع احتمالية ارتفاع طفيف في الرطوبة",
        health_advisory: "اشرب كمية كافية من الماء وتجنب التعرض المباشر للشمس",
        severity: "low",
        severity_reason: "ظروف جوية طبيعية"
      });
    } finally {
      setLoading(false);
    }
  };

  const severityConfig = {
    low: { color: "#06d6a0", bg: "rgba(6,214,160,0.12)", label: "طقس مستقر", icon: "✅" },
    medium: { color: "#FFD166", bg: "rgba(255,209,102,0.12)", label: "انتبه قليلاً", icon: "⚠️" },
    high: { color: "#EF476F", bg: "rgba(239,71,111,0.12)", label: "تحذير", icon: "🚨" },
  };

  const sev = severityConfig[analysis?.severity] || severityConfig.low;

  return (
    <div className="weather-ai-analysis">
      <style>{`
        .weather-ai-analysis {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(10px);
          margin: 16px 0;
        }
        .analysis-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .analysis-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
        }
        .ai-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #48CAE4;
          box-shadow: 0 0 8px #48CAE4;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .analysis-refresh-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 6px 12px;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .analysis-refresh-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .analysis-skeleton {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .skeleton-line {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .analysis-summary {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 10px;
          line-height: 1.4;
        }
        .severity-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .analysis-text {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          line-height: 1.7;
          margin-bottom: 10px;
        }
        .analysis-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 12px 0;
        }
        .analysis-trend {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          line-height: 1.6;
        }
        .analysis-health {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 10px 14px;
          margin-top: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          line-height: 1.5;
        }
        .expand-btn {
          background: none;
          border: none;
          color: #48CAE4;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }
        .analysis-error {
          color: #EF476F;
          font-size: 13px;
          text-align: center;
          padding: 10px 0;
        }
      `}</style>

      <div className="analysis-header">
        <div className="analysis-badge">
          <div className="ai-dot" />
          تحليل الذكاء الاصطناعي
        </div>
        <button className="analysis-refresh-btn" onClick={() => { hasFetched.current = false; fetchAnalysis(); }} disabled={loading}>
          {loading ? "..." : "🔄 تحديث"}
        </button>
      </div>

      {loading && (
        <div className="analysis-skeleton">
          <div className="skeleton-line" style={{ width: "70%" }} />
          <div className="skeleton-line" style={{ width: "100%" }} />
          <div className="skeleton-line" style={{ width: "85%" }} />
          <div className="skeleton-line" style={{ width: "60%" }} />
        </div>
      )}

      {error && <div className="analysis-error">{error}</div>}

      {!loading && !error && analysis && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="analysis-summary">{analysis.summary}</div>
            <div className="severity-pill" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}44` }}>
              <span>{sev.icon}</span>
              <span>{sev.label}</span>
              <span style={{ opacity: 0.7, fontSize: 11 }}>— {analysis.severity_reason}</span>
            </div>
            <div className="analysis-text">{analysis.details}</div>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <div className="analysis-divider" />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  توجه الطقس
                </div>
                <div className="analysis-trend">{analysis.trend}</div>
                <div className="analysis-health">
                  <span style={{ fontSize: 18 }}>🩺</span>
                  <span>{analysis.health_advisory}</span>
                </div>
              </motion.div>
            )}
            <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? "▲ إخفاء التفاصيل" : "▼ المزيد من التفاصيل"}
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default WeatherAnalysis;