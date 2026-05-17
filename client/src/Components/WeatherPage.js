// src/pages/WeatherPage.js
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudRain, Wind, Sun } from "lucide-react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchTips } from "../Features/TipSlice";

/* ─── Condition helper ─── */
const getCondition = (weather) => {
  if (!weather) return "clear";
  const main = (weather.weather?.[0]?.main || "").toLowerCase();
  if (main.includes("rain") || main.includes("drizzle")) return "rain";
  if (main.includes("thunder")) return "thunder";
  if (main.includes("cloud")) return "cloud";
  if (main.includes("snow")) return "snow";
  if (main.includes("fog") || main.includes("mist")) return "fog";
  return "clear";
};

const weatherEmoji = { rain: "🌧️", thunder: "⛈️", cloud: "☁️", snow: "❄️", fog: "🌫️", clear: "☀️" };
const accentByCondition = { clear: "#FFD166", rain: "#48CAE4", thunder: "#f5c518", cloud: "#90c4e0", snow: "#a8d8f0", fog: "#90b8d0" };
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const tipIcon = {
  rain: <CloudRain size={36} color="#FF9F1C" />,
  wind: <Wind size={36} color="#48CAE4" />,
  sun: <Sun size={36} color="#FF5A5F" />,
  danger: <span style={{ fontSize: 36 }}>🚨</span>,
};
const tipLabel = { rain: "Rain", wind: "Wind", sun: "Sunny", danger: "⚠️ Danger Alert" };

/* ─── خريطة تحويل اسم المدينة إلى محافظة ─── */
const CITY_TO_GOVERNORATE = {
  muscat: "Muscat", mutrah: "Muscat", bawshar: "Muscat", seeb: "Muscat",
  salalah: "Dhofar", thumrait: "Dhofar",
  sohar: "Al Batinah North", shinas: "Al Batinah North",
  barka: "Al Batinah South", rustaq: "Al Batinah South",
  nizwa: "Al Dakhiliyah", bahla: "Al Dakhiliyah", "al hamra": "Al Dakhiliyah",
  sur: "Al Sharqiyah South", masirah: "Al Sharqiyah South",
  ibra: "Al Sharqiyah North", "al mudhaibi": "Al Sharqiyah North",
  ibri: "Al Dhahirah", buraimi: "Al Buraimi",
  haima: "Al Wusta",
  khasab: "Musandam",
};

/* ─── تحليل الطقس بالذكاء الاصطناعي ─── */
const analyzeWeather = (weather) => {
  if (!weather) return "";
  const temp = weather.main?.temp ?? 0;
  const humidity = weather.main?.humidity ?? 0;
  const windKph = weather.wind ? +(weather.wind.speed * 3.6).toFixed(1) : 0;
  const rain = weather.rain?.["1h"] ?? 0;
  const condition = (weather.weather?.[0]?.main || "").toLowerCase();

  if (temp >= 42)
    return `Extreme heat alert — temperature has reached ${Math.round(temp)}°C with ${humidity}% humidity. This is a dangerous heat level. Avoid all outdoor exposure, stay in air-conditioned spaces, and drink at least 3–4 liters of water throughout the day.`;
  if (temp >= 38)
    return `Very hot day at ${Math.round(temp)}°C with humidity at ${humidity}%. Heat index is significantly elevated. Avoid going outside between 11 AM and 4 PM, use SPF 50+ sunscreen, wear light-colored loose clothing, and stay well hydrated.`;
  if (temp >= 32)
    return `Warm to hot weather at ${Math.round(temp)}°C and ${humidity}% humidity, with winds at ${windKph} km/h. Outdoor activities are possible with precautions — schedule them before 10 AM or after 5 PM, use sun protection, and take regular water breaks.`;
  if (condition.includes("thunder"))
    return `Thunderstorm conditions detected. Stay indoors, avoid open areas and high ground, and keep away from trees and metal objects. If driving, pull over safely and wait for the storm to pass. Stay alert for sudden flooding.`;
  if (rain > 0 || condition.includes("rain") || condition.includes("drizzle"))
    return `Rainy conditions with ${rain} mm/h precipitation and ${humidity}% humidity. Roads may be slippery — drive carefully and keep your distance. Carry an umbrella or rain jacket and be cautious in low-lying areas prone to flooding.`;
  if (condition.includes("fog") || condition.includes("mist"))
    return `Foggy conditions are reducing visibility. Drive slowly with fog lights on, increase your following distance, and avoid highways if possible. Expect clearer skies later in the day as temperatures rise.`;
  if (condition.includes("cloud"))
    return `Partly cloudy skies with a pleasant temperature of ${Math.round(temp)}°C and winds at ${windKph} km/h. Great conditions for outdoor activities. UV rays can still penetrate clouds, so light sun protection is still recommended.`;
  return `Clear and sunny with ${Math.round(temp)}°C and winds at ${windKph} km/h. Excellent day for all outdoor activities — beach, parks, or sports. Apply sunscreen and stay hydrated, especially if spending extended time outside.`;
};

/* ═══════════════════════════════════════════════════════════
   ✅ دالة getActivities المعدلة - تستخدم التصنيفات الجديدة:
   Excellent, Very Good, Good, Bad
═══════════════════════════════════════════════════════════ */
const getActivities = (weather) => {
  if (!weather) return [];

  const temp = weather.main?.temp ?? 0;
  const humidity = weather.main?.humidity ?? 0;
  const windKph = weather.wind ? +(weather.wind.speed * 3.6).toFixed(1) : 0;
  const rain = weather.rain?.["1h"] ?? 0;
  const condition = (weather.weather?.[0]?.main || "").toLowerCase();

  // متغيرات واضحة لكل حالة
  const isRainy = rain > 0 || condition.includes("rain") || condition.includes("drizzle");
  const isStormy = condition.includes("thunder");
  const isFoggy = condition.includes("fog") || condition.includes("mist");
  const isCloudy = condition.includes("cloud") && !isStormy;
  const isWindy = windKph > 40;
  const isHumid = humidity > 75;
  const isMild = temp >= 20 && temp < 30;
  const isWarm = temp >= 30 && temp < 35;
  const isHot = temp >= 35 && temp < 40;
  const isVeryHot = temp >= 40;

  return [
    {
      name: "Desert Trip",
      icon: "🏕️",
      status: isStormy || isRainy ? "Bad" 
        : isVeryHot ? "Bad" 
        : isHot || isWindy ? "Good" 
        : isWarm || isHumid ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Dangerous — stay indoors" 
        : isRainy ? "Avoid — flash flooding risk" 
        : isVeryHot ? `${Math.round(temp)}°C is too dangerous for desert` 
        : isHot ? "Evening only — carry extra water" 
        : isWindy ? "Strong winds — secure your gear" 
        : isWarm ? "Go early morning or after sunset" 
        : "Great conditions for an adventure",
    },
    {
      name: "Morning Jog",
      icon: "🏃",
      status: isStormy || isVeryHot ? "Bad" 
        : isRainy || isHot ? "Good" 
        : isWarm || isHumid ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Stay indoors — lightning risk" 
        : isVeryHot ? "Too hot — skip or use a gym" 
        : isRainy ? "Slippery roads — be careful" 
        : isHot ? "Go before 7 AM only" 
        : isWarm ? "Early morning recommended" 
        : isHumid ? "High humidity — pace yourself" 
        : "Perfect running conditions",
    },
    {
      name: "Sea Trip",
      icon: "⛵",
      status: isStormy || isWindy ? "Bad" 
        : isRainy || isVeryHot ? "Good" 
        : isHot || isHumid ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Dangerous — high waves & lightning" 
        : isWindy ? `${windKph} km/h winds — unsafe for boats` 
        : isRainy ? "Light rain — check wave conditions" 
        : isVeryHot ? "Stay close to shore, bring shade" 
        : isHot ? "Best in the evening with sunscreen" 
        : "Ideal sea conditions — enjoy!",
    },
    {
      name: "Outdoor Events",
      icon: "🎪",
      status: isStormy || isVeryHot ? "Bad" 
        : isRainy || isHot ? "Good" 
        : isWarm || isCloudy ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Cancel or move indoors" 
        : isVeryHot ? "Heat risk — move event indoors" 
        : isRainy ? "Set up rain covers or reschedule" 
        : isHot ? "Schedule after 6 PM only" 
        : isCloudy ? "Cloudy but fine — good conditions" 
        : "Great weather for outdoor events",
    },
    {
      name: "Cycling",
      icon: "🚴",
      status: isStormy || isRainy || isVeryHot ? "Bad" 
        : isWindy || isHot ? "Good" 
        : isWarm ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Stay off the road" 
        : isRainy ? "Wet roads — braking is reduced" 
        : isVeryHot ? "Too hot — heat exhaustion risk" 
        : isWindy ? `${windKph} km/h crosswinds — be careful` 
        : isHot ? "Ride before 8 AM or after 7 PM" 
        : isWarm ? "Early morning with plenty of water" 
        : "Perfect cycling weather",
    },
    {
      name: "Family Picnic",
      icon: "👨‍👩‍👧",
      status: isStormy || isVeryHot ? "Bad" 
        : isRainy || isHot ? "Good" 
        : isWarm || isCloudy ? "Very Good" 
        : "Excellent",
      note: isStormy ? "Too dangerous for families" 
        : isVeryHot ? "Heat is dangerous for children" 
        : isRainy ? "Pick an indoor picnic spot" 
        : isHot ? "Find a shaded area & bring extra water" 
        : isCloudy ? "Comfortable — enjoy the outdoors" 
        : isWarm ? "Pleasant — avoid midday sun" 
        : "Perfect picnic weather!",
    },
  ];
};

/* ─── ✅ خريطة الحالات الجديدة ─── */
const statusMap = {
  "Excellent": { cls: "excellent", icon: "✦", color: "#06d6a0", bg: "rgba(6,214,160,0.15)" },
  "Very Good": { cls: "very-good", icon: "✔", color: "#48CAE4", bg: "rgba(72,202,228,0.15)" },
  "Good": { cls: "good", icon: "◐", color: "#FFD166", bg: "rgba(255,209,102,0.15)" },
  "Bad": { cls: "bad", icon: "✕", color: "#EF476F", bg: "rgba(239,71,111,0.15)" },
};

/* ─── ✅ تأثير الجسيمات المتحركة (تم إعادة إضافتها) ─── */
const WeatherBg = ({ condition }) => {
  const count = condition === "rain" ? 35 : condition === "snow" ? 25 : 10;
  return (
    <div className="weather-particles-layer">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="weather-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-20px",
            width: condition === "rain" ? "2px" : condition === "snow" ? "7px" : "50px",
            height: condition === "rain" ? "22px" : condition === "snow" ? "7px" : "50px",
            borderRadius: condition === "rain" ? "1px" : "50%",
            background:
              condition === "rain" ? "rgba(148,210,255,0.55)"
                : condition === "snow" ? "rgba(255,255,255,0.85)"
                  : condition === "thunder" ? "rgba(245,197,24,0.15)"
                    : "rgba(255,255,255,0.06)",
            filter: condition === "cloud" || condition === "clear" ? "blur(14px)" : "none",
          }}
          animate={{ y: ["0vh", "110vh"], x: condition === "snow" ? [0, (Math.random() - 0.5) * 70] : 0, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: condition === "rain" ? 1 + Math.random() : condition === "snow" ? 5 + Math.random() * 3 : 12 + Math.random() * 8,
            repeat: Infinity, delay: Math.random() * 5, ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

/* ─── سلايدر التوقعات ─── */
const ForecastSlider = ({ forecast, condition }) => {
  const accent = accentByCondition[condition] || "#FFD166";
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeDot, setActiveDot] = useState(null);

  const grouped = React.useMemo(() => {
    const map = {};
    forecast.forEach((item) => {
      const day = item.dt_txt.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(item);
    });
    return Object.entries(map).slice(0, 5);
  }, [forecast]);

  if (grouped.length === 0) return null;

  const [, hourlyItems] = grouped[selectedDay];
  const temps = hourlyItems.map((f) => f.main.temp);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = maxT - minT || 1;

  return (
    <div className="forecast-strip" style={{ position: 'relative', overflow: 'hidden' }}>
      <WeatherBg condition={condition} />

      <div className="forecast-strip-header">
        <span className="forecast-strip-label">📅 Daily/Hourly Forecast</span>
        <span style={{ color: accent, fontSize: 13, fontWeight: 600 }}>5-Day Outlook</span>
      </div>
      <div className="forecast-strip-days" style={{ marginBottom: 8 }}>
        {grouped.map(([dateStr, items], i) => {
          const d = new Date(dateStr);
          const dayName = dayNames[d.getDay()].slice(0, 3);
          const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
          const isActive = i === selectedDay;
          const dayTemps = items.map((x) => x.main.temp);
          return (
            <motion.div
              key={dateStr}
              className={`forecast-day-card ${isActive ? "active" : ""}`}
              onClick={() => { setSelectedDay(i); setActiveDot(null); }}
              style={{ cursor: "pointer", opacity: isActive ? 1 : 0.65 }}
              whileHover={{ scale: 1.06, y: -5 }}
              animate={{ scale: isActive ? 1.05 : 1 }}
            >
              <div className="forecast-day-name">{dayName}</div>
              <div className="forecast-day-date">{dateLabel}</div>
              <div className="forecast-day-emoji">{weatherEmoji[getCondition(items[0])] || "🌤️"}</div>
              <div className="forecast-day-max">{Math.round(Math.max(...dayTemps))}°</div>
              <div className="forecast-day-min">↓ {Math.round(Math.min(...dayTemps))}°</div>
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "14px 6px", scrollbarWidth: "thin", position: 'relative', zIndex: 2 }}>
        {hourlyItems.map((item, i) => {
          const timeStr = new Date(item.dt_txt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const rainPct = Math.round((item.pop ?? 0) * 100);
          const cond = getCondition(item);
          const isHot = item.main.temp >= 38;
          const tempColor = isHot ? "#FF6B6B" : accent;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.08, y: -4 }}
              style={{
                minWidth: 80, flexShrink: 0, borderRadius: 16,
                background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
                border: "1.5px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)",
                padding: "12px 8px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", cursor: "default",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "rgba(255,255,255,0.75)", marginBottom: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "2px 6px", display: "inline-block" }}>
                {timeStr}
              </div>
              <div style={{ fontSize: 26, margin: "6px 0", lineHeight: 1 }}>{weatherEmoji[cond] || "🌤️"}</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: tempColor, textShadow: `0 0 12px ${tempColor}88`, margin: "4px 0 6px" }}>
                {Math.round(item.main.temp)}°
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: rainPct > 30 ? "#48CAE4" : "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <span>💧</span><span>{rainPct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="forecast-graph" style={{ marginTop: 12, position: 'relative', zIndex: 2 }}>
        <svg width="100%" height="110" viewBox="0 0 600 110" preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
            </linearGradient>
          </defs>
          {temps.length > 1 && (() => {
            const pts = temps.map((t, i) => ({
              x: (i / (temps.length - 1)) * 560 + 20,
              y: 75 - ((t - minT) / range) * 45,
              t,
            }));
            return (
              <>
                <defs>
                  <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <polygon points={[`${pts[0].x},90`, ...pts.map((p) => `${p.x},${p.y}`), `${pts[pts.length - 1].x},90`].join(" ")} fill="url(#areaGrad)" />
                <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => {
                  const isActive = activeDot === i;
                  return (
                    <g key={i} style={{ cursor: "pointer" }} onClick={() => setActiveDot(isActive ? null : i)}>
                      <rect x={p.x - 18} y={p.y - 34} width={36} height={18} rx="5" fill={isActive ? "#fff" : accent} opacity={isActive ? 1 : 0.85} />
                      <text x={p.x} y={p.y - 21} textAnchor="middle" fontSize="10" fontWeight="800" fill={isActive ? accent : "#1a1a2e"}>{Math.round(p.t)}°C</text>
                      <polygon points={`${p.x - 4},${p.y - 16} ${p.x + 4},${p.y - 16} ${p.x},${p.y - 10}`} fill={isActive ? "#fff" : accent} opacity={isActive ? 1 : 0.85} />
                      <circle cx={p.x} cy={p.y} r={isActive ? 9 : 6} fill={isActive ? "#fff" : accent} stroke={isActive ? accent : "rgba(255,255,255,0.8)"} strokeWidth="2" />
                      {isActive && <circle cx={p.x} cy={p.y} r="4" fill={accent} />}
                    </g>
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

/* ─── ✅ سلايدر النصائح (يدعم عرض المحافظة والفلترة) ─── */
const TipsSlider = ({ tips, governorate }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const filteredTips = React.useMemo(() => {
    if (!governorate || governorate === "All") return tips;
    return tips.filter(tip => tip.governorate === governorate || tip.governorate === "All");
  }, [tips, governorate]);

  useEffect(() => { setCurrent(0); }, [filteredTips]);

  const go = (dir) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + filteredTips.length) % filteredTips.length);
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  if (filteredTips.length === 0) {
    return (
      <div className="tips-slider-empty" style={{ textAlign: 'center', padding: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
        No tips available for {governorate || "your location"} yet.
      </div>
    );
  }

  const tip = filteredTips[current];
  const isDanger = tip.type === "danger";

  return (
    <div className="tips-slider-wrapper">
      <button className="tips-slider-arrow tips-slider-arrow--left" onClick={() => go(-1)}>‹</button>
      <div className="tips-slider-track">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            className={`tips-slider-card tips-slider-card--${tip.type}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={isDanger ? {
              background: "linear-gradient(135deg, #7b0000, #c0392b)",
              border: "2px solid #ff6b6b",
              boxShadow: "0 0 18px rgba(220,53,69,0.45)"
            } : {}}
          >
            {tip.governorate && tip.governorate !== "All" && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: isDanger ? "rgba(255,255,255,0.15)" : "rgba(21,84,180,0.12)",
                border: isDanger ? "1px solid rgba(255,100,100,0.5)" : "1px solid rgba(21,84,180,0.25)",
                borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700,
                color: isDanger ? "#ffcccc" : "#1554B4", marginBottom: 10
              }}>
                📍 {tip.governorate}
              </div>
            )}
            <div className="tips-slider-icon">{tipIcon[tip.type] || "📌"}</div>
            <h3 className="tips-slider-type" style={isDanger ? { color: "#ff9999" } : {}}>
              {tipLabel[tip.type] || tip.type}
            </h3>
            <p className="tips-slider-content">{tip.content}</p>
            <div style={{ marginTop: 10, fontSize: 11, opacity: .6, color: isDanger ? "#fff" : undefined }}>
              {current + 1} / {filteredTips.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <button className="tips-slider-arrow tips-slider-arrow--right" onClick={() => go(1)}>›</button>
      <div className="tips-slider-dots">
        {filteredTips.map((_, i) => (
          <span
            key={i}
            className={`tips-slider-dot ${i === current ? "active" : ""}`}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
          />
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════ */
/* 🚀 المكون الرئيسي للصفحة */
/* ════════════════════════════════════════════ */
export default function WeatherPage() {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");

  const dispatch = useDispatch();
  const { tips } = useSelector((state) => state.tips);
  const [detectedGov, setDetectedGov] = useState("");

  useEffect(() => {
    dispatch(fetchTips(undefined));
  }, [dispatch]);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const [current, forecastRes, geoRes] = await Promise.all([
          axios.get(process.env.REACT_APP_WEATHER_URL, { params: { lat, lon, appid: process.env.REACT_APP_API_KEY, units: "metric" } }),
          axios.get("https://api.openweathermap.org/data/2.5/forecast", { params: { lat, lon, appid: process.env.REACT_APP_API_KEY, units: "metric" } }),
          axios.get(process.env.REACT_APP_GEO_URL, { params: { lat, lon, limit: 1, appid: process.env.REACT_APP_API_KEY } }),
        ]);
        setCurrentWeather(current.data);
        if (geoRes.data?.length > 0) {
          const name = geoRes.data[0].name;
          setLocationName(name);
          const gov = CITY_TO_GOVERNORATE[name.toLowerCase()] || "";
          setDetectedGov(gov);
        }
        setForecast(forecastRes.data.list);
        setError(null);
      } catch {
        setError("Failed to fetch weather data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchWeather(23.5880, 58.3829)
        )
      : fetchWeather(23.5880, 58.3829);
  }, []);

  const formatTime = (ts) => ts ? new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const condition = getCondition(currentWeather);
  const aiAnalysis = analyzeWeather(currentWeather);
  const aiActivities = getActivities(currentWeather);

  const detailCards = currentWeather ? [
    { label: "Temperature", value: `${currentWeather?.main?.temp ?? "--"}°C`, icon: "🌡️" },
    { label: "Humidity", value: `${currentWeather?.main?.humidity ?? "--"}%`, icon: "💧" },
    { label: "Wind Speed", value: `${currentWeather?.wind ? (currentWeather.wind.speed * 3.6).toFixed(1) : 0} km/h`, icon: "💨" },
    { label: "Rainfall", value: `${currentWeather?.rain?.["1h"] ?? 0} mm`, icon: "🌧️" },
    { label: "Max Temp", value: `${currentWeather?.main?.temp_max ?? "--"}°C`, icon: "🔆" },
    { label: "Min Temp", value: `${currentWeather?.main?.temp_min ?? "--"}°C`, icon: "❄️" },
    { label: "Sunrise", value: formatTime(currentWeather?.sys?.sunrise), icon: "🌅" },
    { label: "Sunset", value: formatTime(currentWeather?.sys?.sunset), icon: "🌇" },
  ] : [];

  return (
    <div className="page">
      <main className="main">
        <section className={`weather-hero ${condition}`}>
          <div className="weather-hero-inner">
            <div className="weather-hero-header">
              <motion.h1 className="weather-page-title"
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                Taraqqub
              </motion.h1>
              <motion.p className="weather-page-subtitle"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                Real-time weather updates based on your location
              </motion.p>
            </div>
            {(currentWeather || locationName) && (
              <p className="weather-page-location">📍 {locationName || currentWeather?.name}, Oman</p>
            )}
          </div>
        </section>
        
           <section className="features-section">
          <h2 className="section-title">Safety Tips</h2>
          <TipsSlider tips={tips} />
        </section>

        {loading && <p className="weather-loading" style={{ color: "#1E4DB7", padding: "30px 0" }}>Loading weather data...</p>}
        {error && <p className="weather-error" style={{ padding: "20px 0" }}>{error}</p>}

        {!loading && !error && (
          <div className={`weather-details-section ${condition}`}>
            {forecast.length > 0 && (
              <div className="forecast-strip-wrapper">
                <ForecastSlider forecast={forecast} condition={condition} />
              </div>
            )}
            {currentWeather && (
              <div className="weather-details-inner">
                <h2 className="weather-details-title">Weather Details</h2>
                <div className="weather-details-grid">
                  {detailCards.map((d, i) => (
                    <motion.div key={i} className="weather-detail-card"
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.05 * i }} whileHover={{ scale: 1.07, y: -5 }}>
                      <div className="weather-detail-icon">{d.icon}</div>
                      <div className="weather-detail-label">{d.label}</div>
                      <div className="weather-detail-value">{d.value}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

     

        {currentWeather && (
          <section className="ai-section">
            <div className="ai-section-header">
              <div className="ai-section-badge">
                <span className="ai-badge-dot" />
                AI-Powered
              </div>
              <h2 className="ai-section-title">Weather Intelligence</h2>
              <p className="ai-section-sub">Smart analysis and activity recommendations based on current conditions</p>
            </div>

            <div className="ai-tab-row">
              <button className={`ai-tab ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
                <span className="ai-tab-icon">🔍</span> Analysis
              </button>
              <button className={`ai-tab ${activeTab === "recommend" ? "active" : ""}`} onClick={() => setActiveTab("recommend")}>
                <span className="ai-tab-icon">📅</span> Activities
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "analysis" && (
                <motion.div key="analysis"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}
                  className="ai-panel"
                >
                  <div className="ai-analysis-card">
                    <div className="ai-analysis-decoration" />
                    <div className="ai-analysis-emoji">{weatherEmoji[condition] || "☀️"}</div>
                    <div className="ai-analysis-body">
                      <div className="ai-analysis-label">AI Weather Analysis</div>
                      <p className="ai-analysis-text">{aiAnalysis}</p>
                    </div>
                  </div>
                  <div className="ai-pills-row">
                    {[
                      { label: "Condition", value: currentWeather.weather?.[0]?.description ?? "--" },
                      { label: "Temp", value: `${Math.round(currentWeather.main?.temp ?? 0)}°C` },
                      { label: "Humidity", value: `${currentWeather.main?.humidity ?? "--"}%` },
                      { label: "Wind", value: `${(currentWeather.wind ? currentWeather.wind.speed * 3.6 : 0).toFixed(0)} km/h` },
                    ].map((p) => (
                      <div key={p.label} className="ai-pill">
                        <span className="ai-pill-label">{p.label}</span>
                        <span className="ai-pill-value">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "recommend" && (
                <motion.div key="recommend"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}
                  className="ai-panel"
                >
                  <div style={{
                    display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14,
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 13, color: "#0f0404"
                  }}>
                    <span>📍 Based on:</span>
                    <strong style={{ color: "#0f0404" }}>{Math.round(currentWeather.main?.temp)}°C</strong>
                    <span>·</span>
                    <span>{currentWeather.weather?.[0]?.description}</span>
                    <span>·</span>
                    <span>💨 {(currentWeather.wind?.speed * 3.6).toFixed(0)} km/h</span>
                    <span>·</span>
                    <span>💧 {currentWeather.main?.humidity}%</span>
                  </div>

                  <div className="ai-act-grid">
                    {aiActivities.map((act, i) => {
                      const s = statusMap[act.status] || statusMap["Good"];
                      return (
                        <motion.div key={i} className={`ai-act-card status-${s.cls}`}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                          <div className="ai-act-top">
                            <span className="ai-act-emoji">{act.icon}</span>
                            <span className={`ai-act-badge status-${s.cls}`} style={{ background: s.bg, color: s.color }}>
                              {s.icon} {act.status}
                            </span>
                          </div>
                          <div className="ai-act-name">{act.name}</div>
                          <div className="ai-act-note">{act.note}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </main>
    </div>
  );
}