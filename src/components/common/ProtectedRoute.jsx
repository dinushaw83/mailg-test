import { Navigate, useLocation } from "react-router-dom";

import React from "react";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, accessToken } = useSelector((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated || !accessToken) {
    // Redirect to login page but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
