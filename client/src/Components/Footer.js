import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center" }}>
        <span>Afnan Al Subhi & Heba Al Amri | © 2026 | Taraqqub</span>
        <span>All Rights Reserved.</span>

        {/* زر تسجيل دخول الأدمن */}
        <button
          style={{
            marginTop: "10px",
            padding: "5px 15px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#007BFF",
            color: "white",
            cursor: "pointer"
          }}
          onClick={() => navigate("/AdminLogin")}
        >
          Admin Login
        </button>
      </div>
    </footer>
  );
};

export default Footer;