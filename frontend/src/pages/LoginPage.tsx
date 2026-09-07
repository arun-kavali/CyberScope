import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ username: username.trim(), password: password.trim() });
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ALERT_SOURCE') {
        navigate('/alert-source', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected login error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-brand-600 text-white p-3 rounded-xl shadow-sm mb-1">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-brand-900 tracking-tight">CyberScope Platform</h1>
          <p className="text-xs text-slate-500 font-medium">From Security Evidence to Actionable Insight</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center">
              <Lock className="h-4 w-4 text-brand-600 mr-2" /> Enterprise SOC Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">Authenticate with your CyberScope credentials to proceed.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst or alert_source"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAuthLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Seed Account Fillers for Local Dev */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Development Seed Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('analyst', 'Analyst123!')}
                className="p-2 text-left bg-surface-subtle hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded text-xs transition-colors"
              >
                <div className="font-semibold text-brand-900">SOC Analyst</div>
                <div className="text-[10px] text-slate-500 font-mono">analyst / Analyst123!</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('alert_source', 'Source123!')}
                className="p-2 text-left bg-surface-subtle hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded text-xs transition-colors"
              >
                <div className="font-semibold text-brand-900">Alert Source</div>
                <div className="text-[10px] text-slate-500 font-mono">alert_source / Source123!</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
