import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CloudRain, Wind, Sun, Users, Target,
  Shield, Clock, MapPin, Heart, Award, FileText,
} from "lucide-react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicStatistics } from "../Features/ReportSlice";

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

/* ─── Animated Particles ─── */
const WeatherBg = ({ condition }) => {
  const count = condition === "rain" ? 30 : condition === "snow" ? 20 : 8;
  return (
    <div className="weather-particles-layer">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="weather-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-20px",
            width: condition === "rain" ? "2px" : condition === "snow" ? "6px" : "40px",
            height: condition === "rain" ? "20px" : condition === "snow" ? "6px" : "40px",
            borderRadius: condition === "rain" ? "1px" : "50%",
            background: condition === "rain" ? "rgba(148,210,255,0.6)"
              : condition === "snow" ? "rgba(255,255,255,0.8)"
                : condition === "thunder" ? "rgba(245,197,24,0.15)"
                  : "rgba(255,255,255,0.08)",
            filter: (condition === "cloud" || condition === "clear") ? "blur(12px)" : "none",
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: condition === "snow" ? [0, (Math.random() - 0.5) * 60] : 0,
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: condition === "rain" ? 1.2 + Math.random() * 0.8 : condition === "snow" ? 4 + Math.random() * 3 : 10 + Math.random() * 10,
            repeat: Infinity, delay: Math.random() * 4, ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

/* ─── Feature Card ─── */
const FeatureCard = ({ title, text, icon: Icon }) => (
  <motion.div className="feature-card-white" whileHover={{ scale: 1.05 }}>
    {Icon && <Icon size={40} color="#1E4DB7" style={{ marginBottom: "15px" }} />}
    <h3>{title}</h3>
    <p>{text}</p>
  </motion.div>
);

/* ─── About Card ─── */
const AboutCard = ({ title, text, icon: Icon }) => (
  <motion.div className="about-card" whileHover={{ scale: 1.03 }}>
    <div className="about-icon"><Icon size={32} color="#1E4DB7" /></div>
    <h3>{title}</h3>
    <p>{text}</p>
  </motion.div>
);

/* ════════════════════════════════════════════ */
function Home() {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rainAlertLevel, setRainAlertLevel] = useState("normal");
  const [tempAlertLevel, setTempAlertLevel] = useState("normal");
  const [activeUsers, setActiveUsers] = useState(0);

  const dispatch = useDispatch();
  const { publicStatistics, loading: statsLoading } = useSelector((state) => state.reports);
  const condition = getCondition(weather);

  /* ✅ جلب الإحصائيات العامة */
  const loadStatistics = useCallback(() => {
    dispatch(fetchPublicStatistics());
  }, [dispatch]);

  /* ✅ تحديث الإحصائيات عند تحميل الصفحة وكل 30 ثانية */
  useEffect(() => {
    loadStatistics();
    
    const interval = setInterval(() => {
      loadStatistics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadStatistics]);

  /* ✅ جلب عدد المستخدمين النشطين */
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BASE_URL}/public/users/count`)
      .then(r => setActiveUsers(r.data.count))
      .catch(() => { });
  }, []);

  /* ✅ مستويات تحذير الأمطار */
  const getRainAlertLevel = (rf) => {
    if (rf >= 10) return "danger";      // أحمر - خطير
    if (rf >= 2) return "warning";      // أصفر - تحذير
    return "normal";                     // أخضر - عادي
  };
  
  /* ✅ مستويات تحذير درجة الحرارة */
  const getTempAlertLevel = (temp) => {
    if (temp >= 45) return "danger";     // أحمر - خطير (حرارة شديدة)
    if (temp >= 38) return "warning";    // أصفر - تحذير (حرارة عالية)
    return "normal";                     // أخضر - عادي
  };

  /* ✅ تحديد مستوى الخطورة العام */
const getOverallRiskLevel = () => {
  if (rainAlertLevel === "danger" || tempAlertLevel === "danger") {
    return {
      level: "HIGH RISK",
      color: "#dc2626",
      message: "Extreme weather conditions detected",
    };
  }

  if (rainAlertLevel === "warning" || tempAlertLevel === "warning") {
    return {
      level: "MODERATE RISK",
      color: "#f59e0b",
      message: "Weather conditions require attention",
    };
  }

  return {
    level: "LOW RISK",
    color: "#16a34a",
    message: "Weather conditions are stable",
  };
};

/* ✅ آخر تحديث */
const getLastUpdated = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const formatTime = (ts) => ts ? new Date(ts * 1000).toLocaleTimeString() : "";

  /* ✅ جلب بيانات الطقس */
  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const [weatherRes, geoRes] = await Promise.all([
          axios.get(process.env.REACT_APP_WEATHER_URL, { params: { lat, lon, appid: process.env.REACT_APP_API_KEY, units: "metric" } }),
          axios.get(process.env.REACT_APP_GEO_URL, { params: { lat, lon, limit: 1, appid: process.env.REACT_APP_API_KEY } }),
        ]);
        setWeather(weatherRes.data);
        setRainAlertLevel(getRainAlertLevel(weatherRes.data.rain?.["1h"] ?? 0));
        setTempAlertLevel(getTempAlertLevel(weatherRes.data.main?.temp ?? 0));
        if (geoRes.data.length > 0) setLocationName(geoRes.data[0].name);
        setError(null);
      } catch {
        setError("Failed to fetch weather");
      }
      finally { setLoading(false); }
    };

    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(23.5880, 58.3829)
      )
      : fetchWeather(23.5880, 58.3829);
  }, []);

  /* ✅ دالة الحصول على رسالة تحذير الأمطار */
  const getRainAlertMessage = () => {
  const rf = weather?.rain?.["1h"] ?? 0;

  if (rf >= 10) {
    return `🔴 DANGER: Heavy rainfall (${rf.toFixed(1)} mm/h) - Flash flood risk detected.`;
  }

  if (rf >= 2) {
    return `🟡 WARNING: Moderate rainfall (${rf.toFixed(1)} mm/h) - Drive carefully and avoid flooded roads.`;
  }

  if (rf > 0) {
    return `🟢 NORMAL: Light rainfall (${rf.toFixed(1)} mm/h) - Conditions remain stable.`;
  }

  return `🟢 CLEAR: No rainfall detected - Road conditions are safe.`;
};

  /* ✅ دالة الحصول على رسالة تحذير درجة الحرارة */
 const getTempAlertMessage = () => {
  const temp = weather?.main?.temp ?? 0;

  if (temp >= 45) {
    return `🔴 DANGER: Extreme heat (${Math.round(temp)}°C) - Stay indoors and avoid outdoor exposure!`;
  }

  if (temp >= 38) {
    return `🟡 WARNING: High temperature (${Math.round(temp)}°C) - Stay hydrated and avoid direct sunlight.`;
  }

  if (temp >= 31) {
    return `🟢 WARM: Warm weather (${Math.round(temp)}°C) - Outdoor activities are acceptable with precautions.`;
  }

  return `🟢 NORMAL: Comfortable temperature (${Math.round(temp)}°C) - Weather conditions are pleasant.`;
};

  /* ✅ دوال الألوان (أخضر، أصفر، أحمر) */
  const getRainAlertClass = () => {
    if (rainAlertLevel === "danger") return "alert-danger";
    if (rainAlertLevel === "warning") return "alert-warning";
    return "alert-success";
  };

  const getTempAlertClass = () => {
    if (tempAlertLevel === "danger") return "alert-danger";
    if (tempAlertLevel === "warning") return "alert-warning";
    return "alert-success";
  };

  /* ✅ دالة الحصول على الأيقونة المناسبة */
  const getRainIcon = () => {
    if (rainAlertLevel === "danger") return "🔴🌧️";
    if (rainAlertLevel === "warning") return "🟡🌧️";
    return "🟢🌧️";
  };

  const getTempIcon = () => {
    if (tempAlertLevel === "danger") return "🔴🌡️";
    if (tempAlertLevel === "warning") return "🟡🌡️";
    return "🟢🌡️";
  };

  /* ✅ استخدام publicStatistics */
  const totalReports = publicStatistics?.total || 0;
  const resolvedReports = publicStatistics?.resolved || 0;
  const pendingReports = publicStatistics?.pending || 0;
  const inProgressReports = publicStatistics?.inProgress || 0;

  const detailCards = weather ? [
    { label: "Humidity", value: `${weather.main?.humidity}%`, icon: "💧" },
    { label: "Wind", value: `${(weather.wind?.speed * 3.6).toFixed(1)} km/h`, icon: "💨" },
    { label: "Rainfall", value: `${weather.rain?.["1h"] ?? 0} mm`, icon: "🌧" },
    { label: "Temperature", value: `${Math.round(weather.main?.temp)}°C`, icon: "🌡️" },
    { label: "Max / Min", value: `${Math.round(weather.main?.temp_max)}° / ${Math.round(weather.main?.temp_min)}°`, icon: "📈" },
    { label: "Sunrise", value: formatTime(weather.sys?.sunrise), icon: "🌅" },
    { label: "Sunset", value: formatTime(weather.sys?.sunset), icon: "🌇" },
  ] : [];

  const overallRisk = getOverallRiskLevel();

  return (
    <div className="page">
      {/* ── WEATHER ALERTS SECTION ── */}
      <section className="hero-alert">
        <motion.div 
          className="hero-alert-container" 
          initial={{ opacity: 0, y: -40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7 }}
        >
          {/* بوكس أزرق واحد كبير يحتوي على مربعي التنبيه */}
          <div className="hero-blue-box main-alert-box">
            <div className="overall-risk-banner">
  <div className="risk-left">
    <div
      className="risk-indicator"
      style={{ background: overallRisk.color }}
    />
    
    <div>
      <h3>{overallRisk.level}</h3>
      <p>{overallRisk.message}</p>
    </div>
  </div>

  <div className="risk-right">
    <span>🕒 Updated: {getLastUpdated()}</span>
  </div>
</div>
            {/* مربع تنبيه الأمطار */}
            <div className={`alert-sub-box ${getRainAlertClass()}`}>
              <div className="alert-sub-icon">{getRainIcon()}</div>
              <div className="alert-sub-content">
                <div className="alert-sub-title">
                  🌧️ Rainfall Status
                  <span className={`status-badge ${rainAlertLevel}`}>
                    {rainAlertLevel === "danger" ? "DANGER" : rainAlertLevel === "warning" ? "WARNING" : "NORMAL"}
                  </span>
                </div>
                <div className="alert-sub-message">{getRainAlertMessage()}</div>
                <div className="alert-sub-footer">
                  {rainAlertLevel === "danger" && "⚠️ Avoid traveling unless necessary"}
                  {rainAlertLevel === "warning" && "⚠️ Take precautions when going out"}
                  {rainAlertLevel === "normal" && "✓ Roads and outdoor conditions are safe"}
                </div>
              </div>
            </div>

            {/* مربع تنبيه درجة الحرارة */}
            <div className={`alert-sub-box ${getTempAlertClass()}`}>
              <div className="alert-sub-icon">{getTempIcon()}</div>
              <div className="alert-sub-content">
                <div className="alert-sub-title">
                  🌡️ Temperature Status
                  <span className={`status-badge ${tempAlertLevel}`}>
                    {tempAlertLevel === "danger" ? "DANGER" : tempAlertLevel === "warning" ? "WARNING" : "NORMAL"}
                  </span>
                </div>
                <div className="alert-sub-message">{getTempAlertMessage()}</div>
                <div className="alert-sub-footer">
                  {tempAlertLevel === "danger" && "🔥 Stay hydrated! Stay in AC areas!"}
                  {tempAlertLevel === "warning" && "💧 Drink water, wear light clothes"}
                  {tempAlertLevel === "normal" && "✓ Weather is stable for outdoor activities"}
                </div>
              </div>
            </div>
            
          </div>
        </motion.div>
      </section>

      <main className="main">
        {/* ── WEATHER HERO ── */}
        <section className={`weather-hero ${condition}`}>
          <WeatherBg condition={condition} />
          <div className="weather-hero-inner">
            <div className="weather-hero-header">
              <p className="weather-hero-location">📍 {locationName || weather?.name || "Oman"}, Oman</p>
              <h2 className="weather-hero-title">Live Weather</h2>
            </div>
            {loading && <p className="weather-loading">Loading weather...</p>}
            {error && <p className="weather-error">{error}</p>}
            {weather && (
              <motion.div
                className="weather-current-row"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <div className="weather-main-card">
                  <div className="weather-main-emoji">{weatherEmoji[condition]}</div>
                  <div className="weather-main-temp">{Math.round(weather.main?.temp)}°C</div>
                  <div className="weather-main-desc">{weather.weather?.[0]?.description || ""}</div>
                </div>
                {detailCards.map((d, i) => (
                  <motion.div
                    key={i}
                    className="weather-detail-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                    whileHover={{ scale: 1.06, y: -4 }}
                  >
                    <div className="weather-detail-icon">{d.icon}</div>
                    <div className="weather-detail-label">{d.label}</div>
                    <div className="weather-detail-value">{d.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* ── STATS SECTION ── */}
        <section className="stats-section">
          <h2 className="section-title">Reports Overview</h2>
          {statsLoading ? (
            <div className="text-center py-4">Loading statistics...</div>
          ) : (
           <div className="home-stats">
              <div className="home-stat-card">
                <h3>Total</h3>
                <p>{totalReports}</p>
              </div>
              <div className="home-stat-card">
                <h3>Pending</h3>
                <p>{pendingReports}</p>
              </div>
              <div className="home-stat-card">
                <h3>In Progress</h3>
                <p>{inProgressReports}</p>
              </div>
              <div className="home-stat-card">
                <h3>Resolved</h3>
                <p>{resolvedReports}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── FEATURES ── */}
        <section className="features-section">
          <h2 className="section-title">Why Taraqqub?</h2>
          <div className="features-grid">
         <FeatureCard 
      icon={Shield} 
      title="AI Verification" 
      text="Automated image analysis using Computer Vision to verify the severity and authenticity of infrastructure damage reports." 
    />
    <FeatureCard 
      icon={Target} 
      title="Smart Routing" 
      text="Intelligent system that automatically directs verified reports to the relevant Omani authorities for faster response." 
    />
    <FeatureCard 
      icon={FileText} 
      title="Data Analytics" 
      text="Using NLP to analyze user feedback, helping authorities understand community needs and improve system performance." 
    />
    <FeatureCard 
      icon={MapPin} 
      title="Real-time Insights" 
      text="Integration with OpenWeatherMap API to provide live localized weather updates and early warning alerts." 
    />
  </div>
        </section>

        {/* ── ABOUT ── */}
        <section className="about-section">
          <div className="about-header">
            <motion.h2 className="section-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>About Us</motion.h2>
            <motion.p className="about-subtitle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>Who We Are & What We Do</motion.p>
          </div>
          <div className="about-content">
            <motion.div className="about-text" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <h3>Welcome to <span className="highlight">Taraqqub</span></h3>
              <p>Taraqqub (which means "observing & monitoring" in Arabic) is a smart platform that uses AI to connect live weather data with fast emergency actions.</p>
              <p> We use technology to check photos automatically and send reports directly to the right departments in Oman. This ensures that every community report is handled quickly and accurately to keep everyone safe.</p>
              <div className="about-stats">
                <div className="about-stat"><span className="stat-number">2026</span><span className="stat-label">Founded</span></div>
                <div className="about-stat"><span className="stat-number">4.3/5</span><span className="stat-label">User Acceptance</span></div>
                <div className="about-stat">
  <span className="stat-number">90%</span>
  <span className="stat-label">Verification Accuracy</span>
</div>
                <div className="about-stat"><span className="stat-number">{activeUsers}</span><span className="stat-label">Active Users</span></div>
                <div className="about-stat"><span className="stat-number">24/7</span><span className="stat-label">Monitoring</span></div>
              </div>
            </motion.div>
            <motion.div className="about-values" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <h3>Our Values</h3>
              <div className="values-grid">
                <AboutCard 
    icon={Shield} 
    title="Safety & Accuracy" 
    text="We use AI technology to ensure every report is verified and accurate for public safety." 
  />
  <AboutCard 
    icon={Clock} 
    title="Rapid Response" 
    text="Connecting citizens with authorities in real-time to handle infrastructure issues faster." 
  />
  <AboutCard 
    icon={Award} 
    title="Reliability" 
    text="Providing trustworthy weather data and professional guidance during extreme weather." 
  />
  <AboutCard 
    icon={Users} 
    title="Community Support" 
    text="Empowering the Omani community to play an active role in protecting our infrastructure." 
  />
              </div>
            </motion.div>
          </div>
          <motion.div className="about-mission" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
            <div className="mission-card"><h3>🎯 Our Mission</h3><p>To redefine infrastructure crisis management in Oman by providing an AI-driven platform that connects citizens and authorities for a faster, smarter, and safer response.</p></div>
            <div className="vision-card"><h3>🌟 Our Vision</h3><p>To lead the digital transformation of public safety in Oman, building a resilient nation where technology and community collaboration protect lives and infrastructure.</p></div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

export default Home;