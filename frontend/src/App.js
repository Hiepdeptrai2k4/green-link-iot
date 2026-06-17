import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import AdminDevices from './pages/AdminDevices';
import AdminUsers from './pages/AdminUsers';
import SystemOverview from './pages/SystemOverview';

// wrapper to redirect already-logged-in users away from /login
const PublicRoute = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();

  if (isAuthenticated) {
    const target = userRole === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
};

// wrapper to redirect base path "/" based on logged in role
const BasePathRedirect = () => {
  const { isAuthenticated, userRole } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return userRole === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />;
};

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* PUBLIC: Login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Root Redirect handler */}
        <Route path="/" element={<BasePathRedirect />} />

        {/* FARMER / USER ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={['FARMER', 'USER', 'ADMIN']} />}>
          <Route path="/" element={<MainLayout />}>
            <Route path="user/dashboard" element={<Dashboard />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<SystemOverview />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="devices" element={<AdminDevices />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
