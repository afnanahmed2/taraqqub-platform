import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../Features/UserSlice"; // استخدمي thunk فقط
import "../Login.css";
//import { setUser, setLogin } from "../Features/UserSlice";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await dispatch(login({ email, password }));
       if (result.meta.requestStatus === "fulfilled") {
        //localStorage.setItem("token", result.payload.token);
        //dispatch(setUser(result.payload)); // تحديث user في Redux
       //dispatch(setLogin(true));          // تحديث حالة isLogin
        navigate("/"); // دخول ناجح
      } else {
        setError(result.payload?.message || "Login failed");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
    setLoading(false); // انتهى التحميل
   }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Taraqqub Platform</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
             {loading ? "Logging in..." : "Login"}
            </button>
        </form>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

        <p className="login-switch">
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}>Create one</span>
        </p>
      </div>
    </div>
  );
}

export default Login;