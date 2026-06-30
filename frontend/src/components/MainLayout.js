import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Leaf, 
  ChevronDown,
  User
} from 'lucide-react';

export default function MainLayout() {
  const { user, currentGardenId, gardens, setCurrentGardenId, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation schema for sidebar links as requested
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Fixed Dark-Green Theme) */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-darkgreen-950 border-r border-green-900/40 text-slate-300 z-40 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand/Logo Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-green-900/30 bg-darkgreen-950 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-green-500/20 text-green-400 rounded-xl border border-green-500/25">
              <Leaf className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-md font-black text-white tracking-wider">
              GREEN <span className="text-green-400">LINK</span>
            </span>
          </div>
          
          {/* Mobile close toggle */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden hover:bg-green-900/30 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-grow px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide transition-all duration-200
                  ${isActive 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' 
                    : 'text-slate-400 hover:bg-green-900/20 hover:text-white'
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Bottom Profile Card */}
        <div className="p-4 border-t border-green-900/30 bg-darkgreen-950/60 flex-shrink-0">
          <div className="flex items-center space-x-3 p-1">
            <div className="w-10 h-10 rounded-full bg-green-900/40 flex items-center justify-center text-white border border-green-800 font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'Garden Caretaker'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <div className="flex-grow md:pl-64 flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-6 sticky top-0 z-20 flex-shrink-0">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl md:hidden transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Header Left: Garden Selector Dropdown */}
          <div className="flex items-center space-x-3">
            <label htmlFor="garden-select" className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline-block">Chọn Vườn:</label>
            <div className="relative">
              <select
                id="garden-select"
                value={currentGardenId || (gardens[0] ? (gardens[0].deviceId || gardens[0].id) : '')}
                onChange={(e) => setCurrentGardenId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 cursor-pointer shadow-sm transition"
              >
                {gardens && gardens.map((g) => {
                  const devId = g.deviceId || g.id;
                  return (
                    <option key={devId} value={devId}>
                      {g.deviceName || g.name || devId}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Header Right: User Meta and Sign out */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200 h-6">
              <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user?.name || 'Caretaker'}</span>
            </div>
            
            <button
              onClick={logout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 hover:border-rose-200 rounded-xl px-4 py-2 text-sm font-bold transition duration-200 flex items-center space-x-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Content Outlet Viewport */}
        <main className="flex-grow bg-slate-50 p-6 flex flex-col">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
