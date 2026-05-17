import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPublicStatistics, fetchPublicResolvedReports } from '../Features/ReportSlice';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: '⏳', color: 'status-pending' },
  'in-progress': { label: 'In Progress', icon: '🛠️', color: 'status-inprogress' },
  resolved: { label: 'Resolved', icon: '✨', color: 'status-resolved' },
  spam: { label: 'Spam', icon: '⚠️', color: 'status-spam' },
};

const CATEGORY_ICONS = {
  'Road Damage': '🚧',
  'Flooding/Drainage': '🌊',
  'Blocked Drain': '💧',
  'Street Lighting': '🔦',
  'Traffic Signal': '🚦',
  'Waste Management': '♻️',
  'Public Facility Damage': '🏢',
  'Other': '📍',
};

// Governorate names matching the system's data
const GOVERNORATES = [
  "Muscat",
  "Dhofar",
  "Al Batinah North",
  "Al Batinah South",
  "Al Sharqiyah North",
  "Al Sharqiyah South",
  "Al Dakhiliyah",
  "Al Dhahirah",
  "Al Wusta",
  "Musandam",
  "Al Buraimi"
];

const CitizenReport = () => {
  const dispatch = useDispatch();
  
  const { resolvedReports, status, loading, statistics, publicStatistics } = useSelector((state) => state.reports);

  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    dispatch(fetchPublicResolvedReports());
    dispatch(fetchPublicStatistics());
  }, [dispatch]);

  const reportsToDisplay = resolvedReports || [];

  const filtered = reportsToDisplay.filter((r) => {
    if (!r) return false;
    if (!selectedGovernorate) return true;
    const reportGov = (r.governorate || "").toLowerCase();
    const selectedGov = selectedGovernorate.toLowerCase();
    return reportGov.includes(selectedGov);
  });

  // Use either admin statistics or public statistics as fallback
  const stats = statistics || publicStatistics;

  const getStatus = (s) => STATUS_CONFIG[s] || { label: s || 'Unknown', icon: '📋', color: '' };

  return (
    <div className="cr-page">
      <div className="cr-blob cr-blob-1" />
      <div className="cr-blob cr-blob-2" />

      <header className="cr-hero">
        <div className="cr-hero-badge">Taraqqub Platform</div>
        <h1 className="cr-hero-title">Community Reports</h1>
        <p className="cr-hero-sub">
          Track resolved reports submitted across the governorates of the Sultanate of Oman.
        </p>
      </header>

<div className="cr-stats-container" style={{ position: 'relative', zIndex: 3 }}>         <div className="cr-stats-bar">
          {[
            { label: 'Total', value: stats?.total || reportsToDisplay.length, icon: '📊' },
            { label: 'Pending', value: stats?.pending || reportsToDisplay.filter(r => r.status === 'pending').length, icon: '⏳' },
            { label: 'In Progress', value: stats?.inProgress || reportsToDisplay.filter(r => r.status === 'in-progress').length, icon: '🛠️' },
            { label: 'Resolved', value: stats?.resolved || reportsToDisplay.filter(r => r.status === 'resolved').length, icon: '✨' },
          ].map((s, i) => (
            <div className="cr-stat" key={i}>
              <span className="cr-stat-icon">{s.icon}</span>
              <span className="cr-stat-value">{s.value}</span>
              <span className="cr-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cr-filters-wrap" style={{ marginTop: '50px', marginBottom: '50px' }}>
        <div className="cr-filters">
          <div className="cr-search-box">
            <span className="cr-search-icon">🗺️</span>
            <select
              className="cr-select"
              style={{ border: 'none', background: 'transparent', width: '100%', padding: '0' }}
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
            >
              <option value="">All Governorates (Select to Filter)</option>
              {GOVERNORATES.map((gov) => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <main className="cr-main">
        {loading && (
          <div className="cr-loading">
            <div className="cr-spinner" />
            <p>Loading reports...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="cr-empty">
            <h3>No resolved reports found</h3>
            <p>
              {reportsToDisplay.length > 0
                ? "No resolved reports match the selected governorate."
                : "No resolved reports available yet."}
            </p>
          </div>
        )}

        {!loading && (
          <div className="cr-grid">
            {filtered.map((report, i) => {
              const s = getStatus(report.status);
              const catIcon = CATEGORY_ICONS[report.category] || '📍';
              
              return (
                <div
                  className={`cr-card ${report.status === 'resolved' ? 'cr-card-resolved' : ''}`}
                  key={report._id || i}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className={`cr-card-stripe ${s.color}`} />
                  <div className="cr-card-body">
                    <div className="cr-card-header-row">
                      <span className="cr-cat-icon">{catIcon}</span>
                      <span className={`cr-badge ${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <h3 className="cr-card-title">{report.title || "Untitled Report"}</h3>
                    <p className="cr-card-desc">
                      {report.description 
                        ? (report.description.length > 100 ? report.description.slice(0, 100) + '...' : report.description)
                        : "No description provided."}
                    </p>
                    <div className="cr-card-meta">
                      <span>📍 {report.location || "Unknown Location"}, {report.governorate || ""}</span>
                      <span>🗂️ {report.category || "General"}</span>
                      <span>📅 {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-OM') : 'N/A'}</span>
                    </div>
                    {report.status === 'resolved' && (
                      <div className="cr-resolved-stamp">✅ Resolved</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedReport && (
        <div className="cr-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cr-modal-close" onClick={() => setSelectedReport(null)}>✕</button>
            <div className={`cr-modal-status-banner ${getStatus(selectedReport.status).color}`}>
              {getStatus(selectedReport.status).icon} {getStatus(selectedReport.status).label}
            </div>
            <h2 className="cr-modal-title">
              {CATEGORY_ICONS[selectedReport.category] || '📍'} {selectedReport.title || "Report Details"}
            </h2>
            <div className="cr-modal-grid">
              <div className="cr-modal-field">
                <span className="cr-modal-label">Category</span>
                <span>{selectedReport.category || "N/A"}</span>
              </div>
              <div className="cr-modal-field">
                <span className="cr-modal-label">Location</span>
                <span>{selectedReport.location || "N/A"}, {selectedReport.governorate || ""}</span>
              </div>
              <div className="cr-modal-field">
                <span className="cr-modal-label">Assigned Authority</span>
                <span>{selectedReport.assignedAuthority || 'Not specified'}</span>
              </div>
              <div className="cr-modal-field">
                <span className="cr-modal-label">Submitted Date</span>
                <span>{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString('en-OM') : 'N/A'}</span>
              </div>
            </div>
            <div className="cr-modal-desc-box">
              <span className="cr-modal-label">Report Details</span>
              <p>{selectedReport.description || "No details available."}</p>
            </div>
            {selectedReport.recommendation && (
              <div className="cr-modal-rec-box">
                <span className="cr-modal-label">💡 Recommendation</span>
                <p>{selectedReport.recommendation}</p>
              </div>
            )}
            {selectedReport.media?.length > 0 && (
              <div className="cr-modal-media">
                <span className="cr-modal-label">📎 Attached Images</span>
                <div className="cr-modal-img-grid">
                  {selectedReport.media.map((url, i) => (
                    <img key={i} src={url} alt={`Image ${i + 1}`} className="cr-modal-img" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenReport;