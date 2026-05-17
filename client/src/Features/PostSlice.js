import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile, changePassword, getUserStats, getUserReports } from "../Features/UserSlice";
import '../profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLogin, userStats: reduxUserStats, recentReports: reduxRecentReports, loading } = useSelector((state) => state.users || {});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [memberSince, setMemberSince] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [localUserStats, setLocalUserStats] = useState({
    totalReports: 0,
    resolvedReports: 0,
    pendingReports: 0,
    inProgressReports: 0
  });

  const [localRecentReports, setLocalRecentReports] = useState([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  const userStats = (reduxUserStats && reduxUserStats.totalReports !== undefined) ? reduxUserStats : localUserStats;
  const recentReports = (reduxRecentReports && reduxRecentReports.length > 0) ? reduxRecentReports : localRecentReports;
  const isLoading = loading !== undefined ? loading : isLocalLoading;

  // ✅ استخراج userId بشكل صحيح - يدعم id و _id
  const getUserId = (user) => {
    if (!user) return null;
    return user.id || user._id || null;
  };

  useEffect(() => {
    if (!isLogin || !user) {
      navigate("/login");
      return;
    }

    const userId = getUserId(user);
    if (!userId) {
      console.error("User ID is undefined!", user);
      setIsLocalLoading(false);
      return;
    }

    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setRole(user.role || "citizen");

    // ✅ memberSince - من createdAt إذا موجود وإلا "Not available"
    if (user.createdAt) {
      setMemberSince(new Date(user.createdAt).toLocaleDateString());
    } else {
      setMemberSince("Not available");
    }

    fetchUserStats(userId);
    fetchUserReports(userId);
  }, [user, isLogin, navigate]);

  const fetchUserStats = async (userId) => {
    if (!userId) {
      setIsLocalLoading(false);
      return;
    }

    try {
      const result = await dispatch(getUserStats(userId));
      if (result.meta.requestStatus === "fulfilled") return;

      // ✅ Fallback مع token
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BASE_URL}/api/user/${userId}/stats`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setLocalUserStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUserReports = async (userId) => {
    if (!userId) {
      setIsLocalLoading(false);
      return;
    }

    try {
      const result = await dispatch(getUserReports({ userId, limit: 5 }));
      if (result.meta.requestStatus === "fulfilled") {
        setIsLocalLoading(false);
        return;
      }

      // ✅ Fallback مع token
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BASE_URL}/user/${userId}/reports?limit=5`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setLocalRecentReports(data.reports || []);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setErrorMessage("");

    if (!name.trim()) { setErrors({ name: "Name is required" }); return; }
    if (!email.trim()) { setErrors({ email: "Email is required" }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setErrors({ email: "Please enter a valid email address" }); return; }
    if (phone && !/^\d{7,15}$/.test(phone)) { setErrors({ phone: "Phone number must be 7-15 digits" }); return; }

    const userId = getUserId(user);

    try {
      const result = await dispatch(updateUserProfile({ userId, name, email, phone }));
      if (result.meta.requestStatus === "fulfilled") {
        setSuccessMessage("Profile updated successfully!");
        setIsEditing(false);
        setName(result.payload.user.name);
        setEmail(result.payload.user.email);
        setPhone(result.payload.user.phone || "");
        setTimeout(() => setSuccessMessage(""), 3000); // ✅ رقم صحيح
      } else {
        setErrorMessage(result.payload?.message || "Failed to update profile");
      }
    } catch (error) {
      setErrorMessage("Failed to update profile");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentPassword) { setErrors({ currentPassword: "Current password is required" }); return; }
    if (!newPassword) { setErrors({ newPassword: "New password is required" }); return; }
    if (newPassword.length < 6) { setErrors({ newPassword: "Password must be at least 6 characters" }); return; }
    if (newPassword !== confirmNewPassword) { setErrors({ confirmNewPassword: "Passwords do not match" }); return; }

    const userId = getUserId(user);

    try {
      const result = await dispatch(changePassword({ userId, currentPassword, newPassword }));
      if (result.meta.requestStatus === "fulfilled") {
        setSuccessMessage("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowPasswordModal(false);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage(result.payload?.message || "Failed to change password");
      }
    } catch (error) {
      setErrorMessage("Failed to change password");
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case "admin": return <span className="badge-admin">Administrator</span>;
      case "authority": return <span className="badge-authority">Authority</span>;
      default: return <span className="badge-citizen">Citizen</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "completed":
      case "resolved": return <span className="status-badge completed">✓ Completed</span>;
      case "in-progress": return <span className="status-badge in-progress">⚡ In Progress</span>;
      default: return <span className="status-badge pending">⏳ Pending</span>;
    }
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
      <div className="profile-hero">
        <div className="hero-overlay">
          <h1 className="hero-title">My Profile</h1>
          <p className="hero-subtitle">Manage your account information</p>
        </div>
      </div>

      <div className="profile-container">
        {successMessage && <div className="alert-message success">{successMessage}</div>}
        {errorMessage && <div className="alert-message error">{errorMessage}</div>}

        {/* Profile Header */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            <div className="avatar-initials">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{name}</h2>
            <div className="profile-badge">{getRoleBadge(role)}</div>
            <p className="profile-email">{email}</p>
            <p className="profile-member-since">Member since {memberSince}</p>
          </div>
          <div className="profile-actions">
            {!isEditing ? (
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M17 3L21 7L7 21H3V17L17 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M15 5L19 9" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                Edit Profile
              </button>
            ) : (
              <button className="btn-cancel-edit" onClick={() => setIsEditing(false)}>Cancel</button>
            )}
            <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 12C4 7 8 4 12 4C16 4 20 7 22 12C20 17 16 20 12 20C8 20 4 17 2 12Z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Change Password
            </button>
          </div>
        </div>

        <div className="profile-two-columns">
          {/* Left Column */}
          <div className="profile-card">
            <h3 className="card-title">Profile Information</h3>
            {!isEditing ? (
              <div className="profile-details">
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{name || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email Address:</span>
                  <span className="detail-value">{email || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone Number:</span>
                  {/* ✅ إذا عنده رقم يظهره، وإلا "Not provided" */}
                  <span className="detail-value">{phone ? phone : "Not provided"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">{getRoleBadge(role)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Member Since:</span>
                  {/* ✅ إذا عنده تاريخ يظهره، وإلا "Not available" */}
                  <span className="detail-value">{memberSince || "Not available"}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? "error-input" : ""} />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? "error-input" : ""} />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className={errors.phone ? "error-input" : ""} />
                  {errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">Save Changes</button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="profile-card">
            <h3 className="card-title">Your Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{userStats?.totalReports ?? 0}</div>
                <div className="stat-label">Total Reports</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats?.resolvedReports ?? 0}</div>
                <div className="stat-label">Resolved</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats?.pendingReports ?? 0}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats?.inProgressReports ?? 0}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="profile-card full-width">
          <h3 className="card-title">Recent Reports</h3>
          {!recentReports || recentReports.length === 0 ? (
            <div className="no-reports">
              <p>You haven't submitted any reports yet.</p>
              <button className="btn-create-report" onClick={() => navigate("/report")}>
                Create Your First Report
              </button>
            </div>
          ) : (
            <div className="reports-list">
              {recentReports.map((report) => (
                <div key={report._id || report.id} className="report-item">
                  <div className="report-info">
                    <h4 className="report-title">{report.title}</h4>
                    <p className="report-description">
                      {report.description
                        ? report.description.substring(0, 100) + (report.description.length > 100 ? "..." : "")
                        : "No description"}
                    </p>
                    <div className="report-meta">
                      <span className="report-date">
                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}
                      </span>
                      <span className="report-category">{report.category || "General"}</span>
                      {getStatusBadge(report.status || "pending")}
                    </div>
                  </div>
                  <button className="btn-view-report" onClick={() => navigate(`/report/${report._id || report.id}`)}>
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={errors.currentPassword ? "error-input" : ""} />
                {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={errors.newPassword ? "error-input" : ""} />
                {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={errors.confirmNewPassword ? "error-input" : ""} />
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