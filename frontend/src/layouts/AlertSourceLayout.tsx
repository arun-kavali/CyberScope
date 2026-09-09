import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Shield, Send, Cpu, History, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AlertSourceLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Submit Alert', path: '/alert-source', icon: Send },
    { name: 'Scenario Generator', path: '/alert-source/scenarios', icon: Cpu },
    { name: 'Submission History', path: '/alert-source/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Top Navigation Header (Matching Reference Screenshots) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Brand Logo & Portal Indicator */}
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-slate-900 tracking-tight">CyberScope</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Alert Source Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/alert-source'}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Profile & Sign Out (Matching Reference Image Header) */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="hidden sm:flex items-center space-x-2 text-slate-600 font-medium">
                <div className="p-1 bg-slate-100 rounded text-slate-500">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="truncate max-w-[150px] font-semibold text-slate-800">{user?.email || user?.username}</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 font-semibold rounded-lg transition-colors text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>

          {/* Mobile Navigation Tabs Row */}
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/alert-source'}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
