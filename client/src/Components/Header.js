import React, { useState } from "react";
import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarToggler,
  Collapse,
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import logoTaraqqub from "../Images/logoTaraqqub.png";

const Header = () => {
  const user = useSelector((state) => state.users?.user || null);

  const isLogin = !!user;
  const isAdmin = user?.role === "admin"; // ✅ تعريف الأدمن

  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const isActive = (path) => location.pathname === path;

  const handleLinkClick = () => {
    if (isOpen) setIsOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.clear();

    window.location.href = window.location.origin;
  };

  return (
    <Navbar
      expand="lg"
      style={{
        background: "linear-gradient(90deg, #1e3a8a, #004aad)",
        padding: "14px 24px",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* LOGO */}
      <NavbarBrand tag={Link} to="/">
        <img
          src={logoTaraqqub}
          alt="Taraqqub Logo"
          style={{ height: "90px" }}
        />
      </NavbarBrand>

      <NavbarToggler onClick={toggle} />

      <Collapse isOpen={isOpen} navbar>
        {/* CENTER */}
        <Nav className="mx-auto align-items-center" navbar>

          {/* اسم المستخدم */}
          <NavItem className="mx-2">
            <span
              style={{
                color: "#93c2ff",
                fontWeight: "600",
                background: "rgba(56,189,248,0.1)",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              {user?.name || "User"}
            </span>
          </NavItem>

          <NavItem>
            <NavLink
              tag={Link}
              to="/"
              onClick={handleLinkClick}
              className={isActive("/") ? "active" : ""}
            >
              Home
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              tag={Link}
              to="/WeatherPage"
              onClick={handleLinkClick}
              className={isActive("/WeatherPage") ? "active" : ""}
            >
              Weather
            </NavLink>
          </NavItem>

 {/* روابط المستخدم العادي */}
{!isAdmin && (
  <>
    <NavItem>
      <NavLink
        tag={Link}
        to="/Profile"
        onClick={handleLinkClick}
        className={isActive("/Profile") ? "active" : ""}
      >
        Profile
      </NavLink>
    </NavItem>

    <NavItem>
      <NavLink
        tag={Link}
        to="/ReportPage"
        onClick={handleLinkClick}
        className={isActive("/ReportPage") ? "active" : ""}
      >
        Report
      </NavLink>
    </NavItem>

    <NavItem>
      <NavLink
        tag={Link}
        to="/CitizenReort"
        onClick={handleLinkClick}
        className={isActive("/CitizenReort") ? "active" : ""}
      >
        Citizen Reports
      </NavLink>
    </NavItem>

    <NavItem>
      <NavLink
        tag={Link}
        to="/feedback"
        onClick={handleLinkClick}
        className={isActive("/feedback") ? "active" : ""}
      >
        Feedback
      </NavLink>
    </NavItem>
  </>
)}



          {/* ✅ يظهر فقط للأدمن */}
          {isAdmin && (
            <>
              <NavItem>
                <NavLink
                  tag={Link}
                  to="/AdminDashboard"
                  onClick={handleLinkClick}
                  className={isActive("/AdminDashboard") ? "active" : ""}
                >
                  Dashboard
                </NavLink>
              </NavItem>
               <NavItem>
                <NavLink
                  tag={Link}
                  to="/admin/feedback"
                  onClick={handleLinkClick}
                  className={isActive("/admin/feedback") ? "active" : ""}
                >
                  Feedback Mangment
                </NavLink>
              </NavItem>

              <NavItem>
                <NavLink
                  tag={Link}
                  to="/TipsMangment"
                  onClick={handleLinkClick}
                  className={isActive("/TipsMangment") ? "active" : ""}
                >
                  Tips Management
                </NavLink>
              </NavItem>
            </>
          )}
        </Nav>

        {/* RIGHT */}
        <Nav className="ms-auto align-items-center" navbar>
          {!isLogin ? (
            <>
              <NavItem className="me-2">
                <Button
                  tag={Link}
                  to="/Login"
                  className="button-clear"
                  onClick={handleLinkClick}
                >
                  Login
                </Button>
              </NavItem>

            </>
          ) : (
            <NavItem>
              <Button
                onClick={handleLogout}
                style={{
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 14px",
                }}
              >
                Logout
              </Button>
            </NavItem>
          )}
        </Nav>
      </Collapse>
    </Navbar>
  );
};

export default Header;
