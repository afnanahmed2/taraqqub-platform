import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import "../App.css";

const EMAILJS_SERVICE_ID  = "service_1irxpzy";
const EMAILJS_TEMPLATE_ID = "template_x52t54o";
const EMAILJS_PUBLIC_KEY  = "b_Fz6RFrS-j7qg9FA";

export default function SuccessPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const emailSent = useRef(false);

  const report = location.state;

  // ─── الأولوية الصحيحة: userRecommendation لها الأولوية القصوى ───
  const displayPriority =
    report?.userRecommendation?.priority ||
    report?.priority ||
    "Medium";

  const isBadWeather =
    report?.weather?.condition === "Rain" ||
    report?.weather?.condition === "Thunderstorm";

  useEffect(() => {
    if (
      !report ||
      report?.isSpam ||
      report?.isRelevant === false ||
      !report?.priority ||
      !report?.category ||
      emailSent.current
    ) return;

    emailSent.current = true;

    const authority      = report?.assignedAuthority || "Public Authority";
    const recommendation =
      report?.recommendation ||
      report?.aiAnalysis?.recommendation ||
      "No recommendation available";

    emailjs
      .send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          report_title:       report?.title        || "N/A",
          report_category:    report?.category     || "N/A",
          report_priority:    displayPriority,
          report_authority:   authority,
          report_location:    `${report?.location || "N/A"}${report?.governorate ? `, ${report.governorate}` : ""}`,
          report_description: report?.description  || "N/A",
          submitted_by:       report?.createdBy?.name || report?.userName || JSON.parse(localStorage.getItem("user") || "{}")?.name || "Unknown User",
          submitted_date:     new Date().toLocaleString("en-GB"),
          recommendation,
        },
        EMAILJS_PUBLIC_KEY
      )
      .then(() => console.log("✅ Admin notification email sent"))
      .catch((err) => console.error("❌ Failed to send admin email:", err));
  }, [report]);

  if (report?.isRelevant === false) {
    return (
      <div className="alert alert-danger text-center mt-5">
        🚫 هذا البلاغ خارج نطاق الجهات المختصة
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container text-center mt-5">
        <h4>No report data found</h4>
        <button className="btn btn-dark mt-3" onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const recommendation =
    report?.recommendation ||
    report?.aiAnalysis?.recommendation ||
    "No recommendation available";

  const authority = report?.assignedAuthority || "Public Authority";

  if (report?.isSpam) {
    return (
      <div className="container text-center mt-5">
        <div className="alert alert-warning">
          <h4>⚠️ Report Rejected</h4>
          <p>This report was detected as spam.</p>
        </div>
      </div>
    );
  }

  // كشف نوع التقرير للعرض المناسب
  const isPublicMosque = report?.privateType === "PUBLIC_MOSQUE";
  const isPrivateMosque = report?.privateType === "PRIVATE_MOSQUE";
  const isPrivateHouse = report?.privateType === "HOUSE";

  return (
    <div className="success-container">
      <div className="success-card">

        <div className="checkmark">✔</div>
        <h1 className="success-title">Thank You!</h1>
        <p className="success-text">
          Your report has been successfully analyzed and submitted. <br />
          Thank you for helping make Oman safer 🇴🇲
        </p>

        {report ? (
          <div className="ai-box">
            <h4>AI Analysis</h4>

            {/* ✅ Public Mosque Display - مسجد عام */}
            {isPublicMosque && (
              <div className="alert alert-info mt-2 mb-3" style={{
                fontSize: "13px",
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "#e3f2fd",
                border: "1px solid #90caf9"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🕌</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#0d47a1" }}>Public Mosque Report</strong>
                    <div style={{ color: "#1565c0", marginTop: "6px" }}>
                      This report has been forwarded to the Ministry of Awqaf for processing.
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "8px", color: "#555", borderTop: "1px solid #bbdef5", paddingTop: "6px" }}>
                      📍 Category: <strong>Public Facility Damage</strong><br />
                      🏛️ Authority: <strong>Ministry of Awqaf</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Private Mosque Display - مسجد خاص */}
            {isPrivateMosque && (
              <div className="alert alert-warning mt-2 mb-3" style={{
                fontSize: "13px",
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "#fff3e0",
                border: "1px solid #ffb74d"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🏢</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#e65100" }}>Private Mosque Detected</strong>
                    <div style={{ color: "#ef6c00", marginTop: "6px" }}>
                      This mosque is located inside a commercial property.
                    </div>
                    <div style={{ fontSize: "11px", marginTop: "8px", color: "#555", borderTop: "1px solid #ffe0b2", paddingTop: "6px" }}>
                      📍 Category: <strong>Other</strong><br />
                      🏛️ Authority: <strong>General Authority</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Private House Display - منزل خاص */}
            {isPrivateHouse && (
              <div className="alert alert-secondary mt-2 mb-3" style={{
                fontSize: "13px",
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #bdbdbd"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🏠</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#5d4037" }}>Private House Report</strong>
                    <div style={{ color: "#795548", marginTop: "6px" }}>
                      This is a private residence issue. Please contact a private maintenance company.
                    </div>
                  </div>
                </div>
              </div>
            )}


            <p>
              <strong>Category:</strong> {report?.category || "N/A"}
            </p>

            <p>
              <strong>Priority:</strong>{" "}
              <span className={`priority ${displayPriority?.toLowerCase()}`}>
                {displayPriority === "High"   && "🔥 "}
                {displayPriority === "Medium" && "⚠️ "}
                {displayPriority === "Low"    && "✅ "}
                {displayPriority}
              </span>
            </p>

            <p>
              <strong>Assigned Authority:</strong> {authority}
            </p>

            <p>
              <strong>Recommendation:</strong>
              <br />
              {report?.userRecommendation?.message || recommendation}
            </p>

            {report?.weather?.condition && (
              <div style={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: isBadWeather
                  ? "linear-gradient(135deg, #0d1f3c, #162a4a)"
                  : "linear-gradient(135deg, #0d2010, #162a18)",
                border: isBadWeather
                  ? "1px solid rgba(72,202,228,0.5)"
                  : "1px solid rgba(6,214,160,0.5)",
                textAlign: "left"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#48CAE4", boxShadow: "0 0 8px #48CAE4" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
                    Weather-Based Threat Analysis
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "28px" }}>
                    {report.weather?.condition === "Rain"        ? "🌧️"
                      : report.weather?.condition === "Thunderstorm" ? "⛈️"
                      : report.weather?.condition === "Clouds"   ? "☁️"
                      : "☀️"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: "15px" }}>
                      {report.weather?.condition} · {report.weather?.temp ? `${Math.round(report.weather?.temp)}°C` : ""}
                    </div>
                    {report.weather?.description && (
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", textTransform: "capitalize" }}>
                        {report.weather?.description}
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const w   = report.weather?.condition;
                  const cat = report.category || "";
                  let threatLevel = "Low";
                  let threatMsg   = "No significant weather impact detected for this report.";
                  let threatColor = "#06d6a0";

                  if (w === "Thunderstorm") {
                    threatLevel = "High";
                    threatMsg   = "Thunderstorm conditions detected. Priority has been elevated automatically.";
                    threatColor = "#EF476F";
                  } else if (w === "Rain") {
                    if (cat.includes("Flooding") || cat.includes("Blocked Drain")) {
                      threatLevel = "High";
                      threatMsg   = "Rain combined with flooding/drainage issue — high risk of worsening. Priority elevated.";
                      threatColor = "#EF476F";
                    } else if (cat.includes("Road")) {
                      threatLevel = "Medium";
                      threatMsg   = "Wet road conditions increase the severity of this road damage report.";
                      threatColor = "#FFD166";
                    } else {
                      threatLevel = "Medium";
                      threatMsg   = "Rainy conditions may affect response time and issue severity.";
                      threatColor = "#FFD166";
                    }
                  }

                  return (
                    <>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        padding: "4px 12px", borderRadius: "20px", marginBottom: "8px",
                        background: `${threatColor}22`, border: `1px solid ${threatColor}66`,
                        color: threatColor, fontWeight: 600, fontSize: "12px"
                      }}>
                        {threatLevel === "High" ? "🚨" : threatLevel === "Medium" ? "⚠️" : "✅"}
                        {" "}Weather Threat: {threatLevel}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: "1.6" }}>
                        {threatMsg}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted mt-2">
            No AI analysis is available for this report. Please submit a new report
          </p>
        )}

        <div className="btn-group">
          <button className="success-btn" onClick={() => navigate("/")}>Home</button>
          <button className="success-btn outline" onClick={() => navigate("/reportPage")}>New Report</button>
        </div>

      </div>
    </div>
  );
}