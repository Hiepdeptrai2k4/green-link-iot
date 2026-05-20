import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';

// ==========================================
// MOCK LOGIN COMPONENT WITH PREMIUM DESIGN
// ==========================================

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('garden_admin');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    // Simulate login by providing mock user data and a JWT token
    login(
      {
        id: 'usr_9982',
        name: 'Garden Caretaker',
        email: 'admin@greenlink.iot',
        gardenId: 'vuon-lan',
      },
      'mock-jwt-token-value-xyz-123456789'
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-slate-900 to-emerald-950 p-6 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 hover:border-green-500/30 font-sans">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-green-500/20 rounded-2xl mb-4 border border-green-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13.5m0 0L8.25 12.75M12 16.5l3.75-3.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Green Link <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">IOT</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Smart Garden Management Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
              placeholder="Enter password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-lg shadow-green-950/50 hover:shadow-green-900/50 transform hover:-translate-y-0.5"
            >
              Sign In to Garden
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Demo Credentials: Click sign-in directly.</p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ROUTE WRAPPERS & LAYOUT
// ==========================================

// PublicRoute wrapper: Redirects to dashboard (root) if user is already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Dashboard Route with Layout Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="devices" element={
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Thiết bị IoT</h2>
              <p className="text-sm text-slate-500 mt-2">Quản lý và kích hoạt thủ công các relay phần cứng.</p>
            </div>
          } />
          <Route path="history" element={
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Lịch sử hệ thống</h2>
              <p className="text-sm text-slate-500 mt-2">Xem lại biểu đồ ghi nhận và nhật ký sự kiện.</p>
            </div>
          } />
          <Route path="settings" element={
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Cấu hình hệ thống</h2>
              <p className="text-sm text-slate-500 mt-2">Thiết lập ngưỡng tự động tưới tiêu và chiếu sáng.</p>
            </div>
          } />
        </Route>

        {/* Fallback Catch-All Route */}
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
