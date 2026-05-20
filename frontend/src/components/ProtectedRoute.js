import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Route guard that redirects requests to /login if the JWT token is missing.
 */
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    // Redirect to /login if there's no JWT token in state/localStorage
    return <Navigate to="/login" replace />;
  }

  // Render children if token exists
  return children;
};

export default ProtectedRoute;
