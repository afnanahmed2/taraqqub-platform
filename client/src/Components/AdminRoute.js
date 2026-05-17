// src/Components/AdminRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user")); // أو من Redux

  if (!user || user.role !== "admin") {
    return <Navigate to="/Login" />; // إذا مش أدمن يرجع Login
  }

  return children; // إذا أدمن يسمح بالدخول
};

export default AdminRoute;