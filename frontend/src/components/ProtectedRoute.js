import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — RBAC Security Gate
 *
 * @prop {string[]} allowedRoles — Array of roles permitted to access this route group.
 *                                 e.g. ['ADMIN'] or ['USER', 'ADMIN']
 *
 * Behavior:
 *  1. NOT authenticated        → redirect to /login
 *  2. Authenticated BUT role
 *     is NOT in allowedRoles   → redirect to fallback (/ for users, /admin for admins)
 *  3. Authorized               → render <Outlet /> (child routes)
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, userRole } = useAuth();

  // Gate 1: Not logged in at all → go to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Gate 2: Logged in but role is not allowed for this route group
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to the appropriate fallback based on their actual role
    // e.g. a USER trying to access /admin routes → send them back to /
    // e.g. an ADMIN trying to access a USER-only route (rare) → send to /admin
    const fallback = userRole === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={fallback} replace />;
  }

  // Gate 3: Authorized — render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
