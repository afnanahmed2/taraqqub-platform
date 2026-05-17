import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAdminReports, adminUpdateReportStatus, fetchReportStatistics } from '../Features/ReportSlice';
import '../AdminDashboard.css';
import { BarChart3, Calendar, X } from 'lucide-react';
import MapComponent from './MapComponent';
import { useNavigate } from 'react-router-dom';

// ============================================================
// 📊 AdminDashboard Component
// ============================================================

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { reports, status, error, statistics } = useSelector((state) => state.reports);

  // ============================================================
  // 🔐 AUTHENTICATION CHECK - جلب كل البلاغات
  // ============================================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
   
    if (!token) {
      navigate("/login");
      return;
    }
   
    if (userRole !== "admin") {
      navigate("/unauthorized");
      return;
    }
   
    dispatch(fetchAdminReports({ limit: 100000 }));
    dispatch(fetchReportStatistics());
  }, [dispatch, navigate]);

  // ============================================================
  // 📌 STATE MANAGEMENT
  // ============================================================
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    governorate: "",
    priority: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
 
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
    quickRange: ""
  });
 
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ============================================================
  // 🎨 STYLE HELPER FUNCTIONS
  // ============================================================
 
  const getPriorityClass = (priority) => {
    if (!priority) return 'priority-medium';
    const p = priority.toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'low') return 'priority-low';
    return 'priority-medium';
  };

  const getSpamBadge = (rawScore) => {
    const score = Number(rawScore) || 0;
    if (score >= 70) {
      return {
        label: "🚫 Spam",
        bg: "#E63946",
        color: "#fff",
        score,
        level: "high"
      };
    }
    if (score >= 40) {
      return {
        label: "⚠️ Suspicious",
        bg: "#FF9F1C",
        color: "#333",
        score,
        level: "medium"
      };
    }
    return {
      label: "✅ Valid",
      bg: "#28a745",
      color: "#fff",
      score,
      level: "low"
    };
  };

  const extractSpamScore = (report) => {
    if (report.aiAnalysis) {
      const score = report.aiAnalysis.spamScore ?? report.aiAnalysis.score ?? null;
      if (score !== null && !isNaN(score)) return Number(score);
    }
   
    if (report.spamScore !== undefined && !isNaN(report.spamScore)) {
      return Number(report.spamScore);
    }
   
    if (report.status === "spam") {
      return 100;
    }
   
    const combinedText = (report.title + " " + report.description).toLowerCase();
    const spamKeywords = ["test", "testing", "asdf", "qwerty", "dummy", "fake", "sample", "aaa", "bbb", "ccc"];
    let suspiciousCount = 0;
    spamKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) suspiciousCount++;
    });
   
    if (combinedText.length < 30) suspiciousCount += 2;
    if (report.title?.length < 5) suspiciousCount += 1;
    if (report.description?.length < 20) suspiciousCount += 1;
   
    let estimatedScore = Math.min(suspiciousCount * 12, 100);
    return estimatedScore;
  };

  const extractSpamReasons = (report, spamScore) => {
    if (report.aiAnalysis) {
      const reasons = report.aiAnalysis.spamReasons || report.aiAnalysis.reasons || [];
      if (reasons.length > 0) return reasons;
    }
   
    if (report.spamReasons && report.spamReasons.length > 0) {
      return report.spamReasons;
    }
   
    if (spamScore >= 70) {
      return ["🚫 High spam probability detected"];
    }
    if (spamScore >= 40) {
      return ["⚠️ Suspicious content detected"];
    }
   
    return [];
  };

  const orderReportsByStatus = (reportsList) => {
    const statusOrder = {
      "in-progress": 1,
      "pending": 2,
      "resolved": 3,
      "rejected": 4,
      "spam": 5
    };
   
    return [...reportsList].sort((a, b) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };
 
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };
 
  const handleFilterChange = (filterName, value) =>
    setFilters(prev => ({ ...prev, [filterName]: value }));

  // ✅ دالة مساعدة تحول Date إلى YYYY-MM-DD بالتوقيت المحلي
  const toLocalDateStr = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // ✅ دالة اختيار النطاق الزمني السريع - مُصَححة
  const handleQuickDateRange = (range) => {
    if (range === "all") {
      setDateFilter({ startDate: "", endDate: "", quickRange: "all" });
      return;
    }

    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    if (range === "today") {
      // نفس اليوم - start و end نفس التاريخ
    } else if (range === "week") {
      start.setDate(now.getDate() - 7);
    } else if (range === "month") {
      start.setMonth(now.getMonth() - 1);
    }

    setDateFilter({
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
      quickRange: range
    });
  };

  // دالة مسح فلتر التاريخ
  const clearDateFilters = () => {
    setDateFilter({
      startDate: "",
      endDate: "",
      quickRange: ""
    });
    setShowDatePicker(false);
  };

  // ✅ دالة فلترة البلاغات حسب التاريخ - مُصَححة (بدون timezone offset)
  const filterByDate = (report) => {
    if (!dateFilter.startDate && !dateFilter.endDate) return true;

    // نحول تاريخ البلاغ إلى string بالتوقيت المحلي YYYY-MM-DD
    const reportDate = new Date(report.createdAt);
    const reportDateStr = toLocalDateStr(reportDate);

    if (dateFilter.startDate && !dateFilter.endDate) {
      return reportDateStr >= dateFilter.startDate;
    }

    if (!dateFilter.startDate && dateFilter.endDate) {
      return reportDateStr <= dateFilter.endDate;
    }

    if (dateFilter.startDate && dateFilter.endDate) {
      return reportDateStr >= dateFilter.startDate && reportDateStr <= dateFilter.endDate;
    }

    return true;
  };

  // تحديث الفلتر ليشمل فلتر التاريخ
  useEffect(() => {
    if (reports && reports.length > 0) {
      let temp = [...reports];
     
      if (filters.status) {
        temp = temp.filter(r => r.status === filters.status);
      }
     
      if (filters.category) {
        temp = temp.filter(r => r.category === filters.category);
      }
     
      if (filters.governorate) {
        temp = temp.filter(r => r.governorate === filters.governorate);
      }
     
      if (filters.priority) {
        temp = temp.filter(r => (r.priority || "Medium").toLowerCase() === filters.priority);
      }
     
      if (searchTerm.trim()) {
        temp = temp.filter(r => r.title?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
     
      // تطبيق فلتر التاريخ المُصَحح
      temp = temp.filter(filterByDate);
     
      setFilteredReports(temp);
    } else {
      setFilteredReports([]);
    }
  }, [reports, filters, searchTerm, dateFilter.startDate, dateFilter.endDate]);

  if (status === 'loading') {
    return (
      <div className="admin-dashboard-loading">
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        Loading Dashboard...
      </div>
    );
  }
 
  if (status === 'failed') {
    return (
      <div className="admin-dashboard-error">
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        Error: {error}
      </div>
    );
  }

  const totalReports      = statistics?.total      || 0;
  const pendingReports    = statistics?.pending    || 0;
  const inProgressReports = statistics?.inProgress || 0;
  const resolvedReports   = statistics?.resolved   || 0;
  const spamReports       = statistics?.spam       || 0;
  const rejectReports     = statistics?.rejected   || 0;

  return (
    <div className="admin-dashboard-container">

      <header className="admin-dashboard-header">
        <h1>🛡️ Taraqqub Authority Dashboard</h1>
        <p>Manage and monitor all reports</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboardCharts')}
          className="charts-nav-btn"
          style={{
            background: 'linear-gradient(135deg, #1E4DB7, #0F2E6D)',
            border: 'none',
            color: 'white',
            padding: '12px 32px',
            borderRadius: '40px',
            fontSize: '15px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(30,77,183,0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(30,77,183,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(30,77,183,0.3)';
          }}
        >
          <BarChart3 size={20} /> 📊 View Detailed Analytics
        </button>
      </div>

      <section className="admin-dashboard-stats">
        <div className="stat-card"><h3>Total Reports</h3><p>{totalReports}</p></div>
        <div className="stat-card"><h3>Pending</h3><p>{pendingReports}</p></div>
        <div className="stat-card"><h3>In Progress</h3><p>{inProgressReports}</p></div>
        <div className="stat-card"><h3>Resolved</h3><p>{resolvedReports}</p></div>
        <div className="stat-card"><h3>Spam</h3><p>{spamReports}</p></div>
        <div className="stat-card"><h3>Rejected</h3><p>{rejectReports}</p></div>
      </section>

      {isModalOpen && selectedReport && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-button" onClick={handleCloseModal}>×</button>
           
            <h2>📋 {selectedReport.title}</h2>
           
            <p><strong>Category:</strong> {selectedReport.category}</p>
            <p><strong>Assigned Authority:</strong> {selectedReport.assignedAuthority || 'Not specified'}</p>
            <p><strong>Priority:</strong>
              <span className={getPriorityClass(selectedReport.priority)}>
                {selectedReport.priority || 'Medium'}
              </span>
            </p>
            <p><strong>Status:</strong>
              <span className={`status-badge ${selectedReport.status}`}>
                {selectedReport.status}
              </span>
            </p>
            <p><strong>Description:</strong> {selectedReport.description}</p>
            <p><strong>Location:</strong> {selectedReport.location}, {selectedReport.governorate}</p>
            <p><strong>Coordinates:</strong> Lat: {selectedReport.coordinates?.lat}, Lng: {selectedReport.coordinates?.lng}</p>
            <p><strong>Recommendation:</strong> {selectedReport.recommendation}</p>
            <p><strong>Submitted By:</strong> {selectedReport.createdBy?.name || 'Unknown'}
              {selectedReport.createdBy?.email && ` (${selectedReport.createdBy.email})`}
            </p>
            <p><strong>Submitted Date:</strong> {new Date(selectedReport.createdAt).toLocaleString()}</p>
           
            {(() => {
              const modalSpamScore = extractSpamScore(selectedReport);
              const modalSpamReasons = extractSpamReasons(selectedReport, modalSpamScore);
              const modalSpamBadge = getSpamBadge(modalSpamScore);
             
              return (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <strong>🤖 AI Spam Analysis:</strong>
                  <p style={{ margin: '4px 0' }}>
                    Score: {modalSpamScore}/100 —{' '}
                    <span style={{ color: modalSpamBadge.bg, fontWeight: 700 }}>
                      {modalSpamBadge.label}
                    </span>
                  </p>
                  {modalSpamReasons.length > 0 && (
                    <ul style={{ margin: '4px 0', paddingLeft: '18px', fontSize: '13px', color: '#666' }}>
                      {modalSpamReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                </div>
              );
            })()}
           
          {selectedReport.media.map((url, index) => {
  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) ||
                  url.includes('/image/upload/');
  return isImage ? (
    <img key={index} src={url} alt={`Media ${index + 1}`} className="report-img-preview" />
  ) : (
    <video key={index} controls className="report-video-preview" src={url} />
      );
                  })}
                </div>
              </div>
            )}
       

      <section className="admin-dashboard-content">
        <div className="reports-table-section">
          <h2>📊 Reports Overview</h2>
         
          <div style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
            📋 Showing {filteredReports.length} of {reports?.length || 0} total reports
          </div>

          {/* فلتر التاريخ */}
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Calendar size={20} color="#1E4DB7" />
              <strong style={{ fontSize: '16px' }}>Filter by Date:</strong>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  padding: '6px 12px',
                  background: '#1E4DB7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showDatePicker ? 'Hide Options' : 'Show Date Options'}
              </button>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  onClick={clearDateFilters}
                  style={{
                    padding: '6px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>

            {showDatePicker && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  {["today", "week", "month", "all"].map((range) => (
                    <button
                      key={range}
                      onClick={() => handleQuickDateRange(range)}
                      style={{
                        padding: '6px 16px',
                        background: dateFilter.quickRange === range ? '#1E4DB7' : '#e9ecef',
                        color: dateFilter.quickRange === range ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      {range === "today" ? "Today" : range === "week" ? "Last 7 Days" : range === "month" ? "Last 30 Days" : "All Time"}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({
                        ...prev,
                        startDate: e.target.value,
                        quickRange: ""
                      }))}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({
                        ...prev,
                        endDate: e.target.value,
                        quickRange: ""
                      }))}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  {dateFilter.startDate && dateFilter.endDate && (
                    <div style={{ fontSize: '13px', color: '#28a745' }}>
                      📅 Range: {new Date(dateFilter.startDate).toLocaleDateString()} - {new Date(dateFilter.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(dateFilter.startDate || dateFilter.endDate) && (
              <div style={{
                marginTop: '10px',
                padding: '8px',
                background: '#e3f2fd',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#1E4DB7'
              }}>
                🔍 Active Date Filter:
                {dateFilter.startDate && ` From ${new Date(dateFilter.startDate).toLocaleDateString()}`}
                {dateFilter.endDate && ` To ${new Date(dateFilter.endDate).toLocaleDateString()}`}
                {dateFilter.quickRange && ` (${dateFilter.quickRange === 'today' ? 'Today' : dateFilter.quickRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'})`}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="🔍 Search by title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              marginBottom: "10px",
              width: "250px",
              borderRadius: "8px",
              border: "1px solid #ccc"
            }}
          />

          <div className="filter-controls">
            <select onChange={e => handleFilterChange("status", e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="spam">Spam</option>
              <option value="rejected">Rejected</option>
            </select>
           
            <select onChange={e => handleFilterChange("priority", e.target.value)}>
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
           
            <select onChange={e => handleFilterChange("category", e.target.value)}>
              <option value="">All Categories</option>
              <option value="Road Damage">Road Damage</option>
              <option value="Flooding/Drainage">Flooding / Drainage</option>
              <option value="Blocked Drain">Blocked Drain</option>
              <option value="Street Lighting">Street Lighting</option>
              <option value="Traffic Signal">Traffic Signal</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Public Facility Damage">Public Facility Damage</option>
              <option value="Other">Other</option>
            </select>
           
            <select onChange={e => handleFilterChange("governorate", e.target.value)}>
              <option value="">All Governorates</option>
              <option value="Muscat">Muscat</option>
              <option value="Dhofar">Dhofar</option>
              <option value="Al Batinah North">Al Batinah North</option>
              <option value="Al Batinah South">Al Batinah South</option>
              <option value="Al Sharqiyah North">Al Sharqiyah North</option>
              <option value="Al Sharqiyah South">Al Sharqiyah South</option>
              <option value="Al Dakhiliyah">Al Dakhiliyah</option>
              <option value="Al Dhahirah">Al Dhahirah</option>
              <option value="Al Wusta">Al Wusta</option>
              <option value="Musandam">Musandam</option>
              <option value="Al Buraimi">Al Buraimi</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Authority</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                  <th>AI Spam Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports?.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                      No reports match the selected filters
                    </td>
                  </tr>
                ) : (
                  orderReportsByStatus(filteredReports).map(report => {
                    const spamScore = extractSpamScore(report);
                    const spamReasons = extractSpamReasons(report, spamScore);
                    const spamBadge = getSpamBadge(spamScore);
                   
                    return (
                      <tr key={report._id}>
                        <td style={{ fontWeight: 600 }}>{report.title}</td>
                        <td>{report.category}</td>
                       
                        <td>
                          <select
                            style={{ border: 'none', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                            value={report.assignedAuthority || 'General Authority'}
                            onChange={e => dispatch(adminUpdateReportStatus({
                              id: report._id,
                              authority: e.target.value
                            }))}
                          >
                            <option value="Ministry of Transport">Ministry of Transport</option>
                            <option value="Municipality">Municipality</option>
                            <option value="Royal Oman Police (ROP)">Royal Oman Police (ROP)</option>
                            <option value="Ministry of Awqaf">Ministry of Awqaf</option>
                            <option value="General Authority">General Authority</option>
                          </select>
                        </td>
                       
                        <td>
                          <select
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                            className={getPriorityClass(report.priority)}
                            value={report.priority || 'Medium'}
                            onChange={e => dispatch(adminUpdateReportStatus({
                              id: report._id,
                              priority: e.target.value
                            }))}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                       
                        <td>
                          <span className={`status-badge ${report.status}`}>
                            {report.status}
                          </span>
                        </td>
                       
                        <td style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(report.createdAt).toLocaleDateString()}
                          <br />
                          <small>{new Date(report.createdAt).toLocaleTimeString()}</small>
                        </td>
                       
                        <td>
                          <button className="view-btn" onClick={() => handleViewDetails(report)}>
                            View
                          </button>
                          <select
                            className="status-select"
                            value={report.status}
                            onChange={e => dispatch(adminUpdateReportStatus({
                              id: report._id,
                              status: e.target.value
                            }))}
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="spam">Spam</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          {report.status === "spam" && (
                            <button
                              className="cancel-spam-btn"
                              onClick={() => dispatch(adminUpdateReportStatus({
                                id: report._id,
                                status: "pending"
                              }))}
                            >
                              Cancel Spam
                            </button>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                            <span style={{
                              background: spamBadge.bg,
                              color: spamBadge.color,
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textAlign: 'center'
                            }}>
                              {spamBadge.label}
                            </span>
                           
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{
                                flex: 1,
                                height: '5px',
                                background: '#eee',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${spamScore}%`,
                                  height: '100%',
                                  background: spamBadge.bg,
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '10px', color: '#888', whiteSpace: 'nowrap' }}>
                                {spamScore}/100
                              </span>
                            </div>
                           
                            {spamReasons.length > 0 && spamScore >= 40 && (
                              <span
                                style={{ fontSize: '10px', color: '#999', cursor: 'help' }}
                                title={spamReasons.join(' | ')}
                              >
                                ⓘ {spamReasons[0].substring(0, 28)}...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="map-section">
          <h2>🗺️ Reports Map</h2>
          <MapComponent reports={filteredReports} />
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
