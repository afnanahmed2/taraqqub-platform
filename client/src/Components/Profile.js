import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile, changePassword } from "../Features/UserSlice";
import '../profile.css';

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

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLogin } = useSelector((state) => state.users || state.user || {});

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [role, setRole]               = useState("");
  const [memberSince, setMemberSince] = useState("");

  const [currentPassword, setCurrentPassword]       = useState("");
  const [newPassword, setNewPassword]               = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal]   = useState(false);

  const [isEditing, setIsEditing]           = useState(false);
  const [errors, setErrors]                 = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage]     = useState("");

  const [reports, setReports]             = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // ✅ إحصائيات كاملة مع rejected
  const stats = {
    total:      reports.length,
    resolved:   reports.filter(r => r.status === 'resolved' || r.status === 'completed').length,
    pending:    reports.filter(r => r.status === 'pending').length,
    inProgress: reports.filter(r => r.status === 'in-progress').length,
    spam:       reports.filter(r => r.status === 'spam').length,
    rejected:   reports.filter(r => r.status === 'rejected').length,
  };

  useEffect(() => {
    if (!isLogin || !user) { navigate("/login"); return; }
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setRole(user.role || "citizen");
    setMemberSince(user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A");
    loadReports();
  }, [user, isLogin]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_BASE_URL}/api/user/${user.id}/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setErrors({}); setSuccessMessage(""); setErrorMessage("");
    if (!name.trim())  { setErrors({ name: "Name is required" }); return; }
    if (!email.trim()) { setErrors({ email: "Email is required" }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: "Invalid email" }); return; }
    if (phone && !/^\d{7,15}$/.test(phone)) { setErrors({ phone: "Phone must be 7-15 digits" }); return; }
    try {
      const result = await dispatch(updateUserProfile({ userId: user.id, name, email, phone }));
      if (result.meta.requestStatus === "fulfilled") {
        setSuccessMessage("Profile updated successfully!");
        setIsEditing(false);
        setName(result.payload.user.name);
        setEmail(result.payload.user.email);
        setPhone(result.payload.user.phone || "");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage(result.payload?.message || "Failed to update profile");
      }
    } catch { setErrorMessage("Failed to update profile"); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!currentPassword) { setErrors({ currentPassword: "Required" }); return; }
    if (!newPassword)      { setErrors({ newPassword: "Required" }); return; }
    if (newPassword.length < 6) { setErrors({ newPassword: "Min 6 characters" }); return; }
    if (newPassword !== confirmNewPassword) { setErrors({ confirmNewPassword: "Passwords do not match" }); return; }
    try {
      const result = await dispatch(changePassword({ userId: user.id, currentPassword, newPassword }));
      if (result.meta.requestStatus === "fulfilled") {
        setSuccessMessage("Password changed!");
        setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
        setShowPasswordModal(false);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage(result.payload?.message || "Failed");
      }
    } catch { setErrorMessage("Failed to change password"); }
  };

  const getRoleBadge = (r) => {
    if (r === "admin")     return <span className="badge-admin">Administrator</span>;
    if (r === "authority") return <span className="badge-authority">Authority</span>;
    return <span className="badge-citizen">Citizen</span>;
  };

  // ✅ إضافة rejected في getStatusBadge
  const getStatusBadge = (s) => {
    const map = {
      completed:     <span className="status-badge completed">✓ Completed</span>,
      resolved:      <span className="status-badge completed">✅ Resolved</span>,
      'in-progress': <span className="status-badge in-progress">⚡ In Progress</span>,
      pending:       <span className="status-badge pending">⏳ Pending</span>,
      spam:          <span className="status-badge spam">🚫 Spam</span>,
      rejected:      <span className="status-badge rejected">❌ Rejected</span>,
    };
    return map[s] || <span className="status-badge pending">⏳ Pending</span>;
  };

  // ✅ helper للـ modal banner مع rejected
  const getModalBannerClass = (status) => {
    if (status === 'in-progress') return 'inprogress';
    if (status === 'resolved' || status === 'completed') return 'resolved';
    if (status === 'spam')     return 'spam';
    if (status === 'rejected') return 'rejected';
    return 'pending';
  };

  const getModalBannerText = (status) => {
    if (status === 'resolved' || status === 'completed') return '✨ RESOLVED';
    if (status === 'in-progress') return '🛠️ IN PROGRESS';
    if (status === 'pending')     return '⏳ PENDING';
    if (status === 'spam')        return '🚫 SPAM';
    if (status === 'rejected')    return '❌ REJECTED';
    return '⏳ PENDING';
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* Hero */}
      <div className="profile-hero">
        <div className="hero-overlay">
          <h1 className="hero-title">My Profile</h1>
          <p className="hero-subtitle">Manage your account information</p>
        </div>
      </div>

      <div className="profile-container">

        {successMessage && <div className="alert-message success">{successMessage}</div>}
        {errorMessage   && <div className="alert-message error">{errorMessage}</div>}

        {/* Profile Header - نفس ستايل الكود الأول */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            <div className="avatar-initials">{name ? name.charAt(0).toUpperCase() : "U"}</div>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{name}</h2>
            <div className="profile-badge">{getRoleBadge(role)}</div>
            <p className="profile-email">{email}</p>
            <p className="profile-member-since">Member since {memberSince}</p>
          </div>
          <div className="profile-actions">
            {!isEditing
              ? <button className="btn-edit" onClick={() => setIsEditing(true)}>✏️ Edit Profile</button>
              : <button className="btn-cancel-edit" onClick={() => setIsEditing(false)}>Cancel</button>
            }
            <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>🔒 Change Password</button>
          </div>
        </div>

        {/* Two Columns - نفس ستايل الكود الأول */}
        <div className="profile-two-columns">

          {/* Left — Info / Edit Form */}
          <div className="profile-card">
            <h3 className="card-title">Profile Information</h3>
            {!isEditing ? (
              <div className="profile-details">
                <div className="detail-row"><span className="detail-label">Full Name:</span><span className="detail-value">{name}</span></div>
                <div className="detail-row"><span className="detail-label">Email:</span><span className="detail-value">{email}</span></div>
                <div className="detail-row"><span className="detail-label">Phone:</span><span className="detail-value">{phone || "Not provided"}</span></div>
                <div className="detail-row"><span className="detail-label">Role:</span><span className="detail-value">{getRoleBadge(role)}</span></div>
                <div className="detail-row"><span className="detail-label">Member Since:</span><span className="detail-value">{memberSince}</span></div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={errors.name ? "error-input" : ""} />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={errors.email ? "error-input" : ""} />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" className={errors.phone ? "error-input" : ""} />
                  {errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">Save Changes</button>
                </div>
              </form>
            )}
          </div>

          {/* Right — Stats مع إضافة rejected */}
          <div className="profile-card">
            <h3 className="card-title">Your Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Reports</div></div>
              <div className="stat-item"><div className="stat-value">{stats.resolved}</div><div className="stat-label">Resolved</div></div>
              <div className="stat-item"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending</div></div>
              <div className="stat-item"><div className="stat-value">{stats.inProgress}</div><div className="stat-label">In Progress</div></div>
              <div className="stat-item"><div className="stat-value">{stats.spam}</div><div className="stat-label">Spam</div></div>
              {/* ✅ إضافة rejected */}
              <div className="stat-item"><div className="stat-value">{stats.rejected}</div><div className="stat-label">Rejected</div></div>
            </div>
          </div>

        </div>

        {/* Reports List - نفس ستايل الكود الأول */}
        <div className="profile-card full-width">
          <h3 className="card-title">My Reports</h3>
          {reports.length === 0 ? (
            <div className="no-reports">
              <p>You have not submitted any reports yet.</p>
              <button className="btn-create-report" onClick={() => navigate("/ReportPage")}>Create Your First Report</button>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="report-item report-item-clickable"
                  onClick={() => setSelectedReport(report)}
                >
                  {report.media && report.media.length > 0 ? (
                    <img src={report.media[0]} alt="report" className="report-item-thumb" />
                  ) : (
                    <div className="report-item-thumb report-item-thumb--empty">
                      {CATEGORY_ICONS[report.category] || '📍'}
                    </div>
                  )}
                  <div className="report-info">
                    <h4 className="report-title">{report.title}</h4>
                    <p className="report-description">
                      {report.description ? report.description.substring(0, 100) + '...' : "No description"}
                    </p>
                    <div className="report-meta">
                      <span className="report-date">📅 {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}</span>
                      <span className="report-category">🗂️ {report.category || "General"}</span>
                      {getStatusBadge(report.status || "pending")}
                    </div>
                  </div>
                  <button className="btn-view-report" onClick={e => { e.stopPropagation(); setSelectedReport(report); }}>
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* REPORT DETAIL MODAL - نفس ستايل الكود الأول مع دعم rejected */}
      {selectedReport && (
        <div className="rm-overlay" onClick={() => setSelectedReport(null)}>
          <div className="rm-box" onClick={e => e.stopPropagation()}>

            <div className={`rm-banner rm-banner--${getModalBannerClass(selectedReport.status)}`}>
              <span className="rm-banner-text">{getModalBannerText(selectedReport.status)}</span>
              <button className="rm-close" onClick={() => setSelectedReport(null)}>✕</button>
            </div>

            <div className="rm-body">

              <div className="rm-title-row">
                <span className="rm-cat-icon">{CATEGORY_ICONS[selectedReport.category] || '📍'}</span>
                <h2 className="rm-title">{selectedReport.title || 'Report Details'}</h2>
              </div>
              <hr className="rm-divider" />

              <div className="rm-grid">
                <div className="rm-field">
                  <span className="rm-label">CATEGORY</span>
                  <span className="rm-value">{selectedReport.category || 'N/A'}</span>
                </div>
                <div className="rm-field">
                  <span className="rm-label">LOCATION</span>
                  <span className="rm-value">
                    {[selectedReport.location, selectedReport.governorate].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="rm-field">
                  <span className="rm-label">ASSIGNED AUTHORITY</span>
                  <span className="rm-value">
                    {selectedReport.assignedAuthority
                      ? <span className="rm-authority-badge">{selectedReport.assignedAuthority}</span>
                      : <span style={{ color: '#aaa' }}>Not specified</span>}
                  </span>
                </div>
                <div className="rm-field">
                  <span className="rm-label">SUBMITTED DATE</span>
                  <span className="rm-value">
                    {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="rm-desc-box">
                <span className="rm-box-label">REPORT DETAILS</span>
                <p className="rm-box-text">{selectedReport.description || 'No description provided.'}</p>
              </div>

              {selectedReport.recommendation && (
                <div className="rm-rec-box">
                  <span className="rm-box-label">💡 RECOMMENDATION</span>
                  <p className="rm-box-text">{selectedReport.recommendation}</p>
                </div>
              )}

              {selectedReport.media && selectedReport.media.length > 0 && (
                <div className="rm-media">
                  <span className="rm-box-label">📎 ATTACHED IMAGES</span>
                  <div className="rm-img-grid">
                    {selectedReport.media.map((url, i) => (
                      <img key={i} src={url} alt={`Image ${i + 1}`} className="rm-img" />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL - نفس ستايل الكود الأول */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={errors.currentPassword ? "error-input" : ""} />
                {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={errors.newPassword ? "error-input" : ""} />
                {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={errors.confirmNewPassword ? "error-input" : ""} />
                {errors.confirmNewPassword && <span className="field-error">{errors.confirmNewPassword}</span>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn-modal-submit">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;