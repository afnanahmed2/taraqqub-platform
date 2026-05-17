import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { adminLogin } from "../Features/AdminSlice";
import "../Login.css"; // ✅ نفس ستايل المستخدم

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // 1. استدعاء الدالة
    const result = await dispatch(adminLogin({ email, password }));

    // 2. التحقق من النجاح (fulfilled)
    if (result.meta.requestStatus === "fulfilled") {
      //  التعديل الجوهري: استخدام result.payload بدلاً من result.data
      //const data = result.payload; 
      
      if (result.payload?.token) {
        //localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", 'admin');
        localStorage.setItem("token", result.payload.token);
        
        // التوجه لصفحة الداشبورد (تأكد من مطابقة حالة الأحرف في المسار)
        navigate("/AdminDashboard"); 
      } else {
        setError("Login failed: Token not received");
      }
    } else {
      // إظهار رسالة الخطأ القادمة من السيرفر
      setError(result.payload?.message || "Login failed: Incorrect email or password");
    }
  } catch (err) {
    console.error("Admin Login Error:", err);
    setError("An unexpected error occurred during login");
  } finally {
    setLoading(false);
  }
};

  const goToUserLogin = () => navigate("/login");

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Taraqqub Platform</h2>
        <h3>Admin Login</h3>

        <form onSubmit={handleAdminLogin}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "⏳ Logging in..." : "Login as Admin"}
          </button>
        </form>

        <p className="login-switch">
          <span onClick={goToUserLogin}>
            ← Back to User Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;