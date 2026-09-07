import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, AlertCircle, RefreshCw, KeyRound, Mail, Eye, EyeOff, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<'SOC_ANALYST' | 'ALERT_SOURCE'>('SOC_ANALYST');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginUser = username.trim() || email.trim();
    if (!loginUser || !password.trim()) {
      setError('Please enter both email/username and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ username: loginUser, password: password.trim() });
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
        setError('An unexpected authentication error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setEmail(userVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 md:p-6">
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-xl overflow-hidden min-h-screen md:min-h-[640px] md:rounded-2xl grid grid-cols-1 lg:grid-cols-2">
        {/* Left Branded Panel (Reference Design Left Half) */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-brand-900 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative background ring */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-10 top-20 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-8 relative z-10">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-xs text-white p-2.5 rounded-xl border border-white/30 shadow-xs">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">CyberScope</span>
            </div>

            {/* Product Value Proposition */}
            <div className="space-y-4 pt-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Protect your infrastructure, anytime, anywhere.
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-md font-medium">
                AI-powered SOC alert triage that reduces noise and highlights real threats, helping your security team respond faster.
              </p>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="pt-8 relative z-10 flex items-center space-x-2 text-[11px] text-emerald-200/80 font-medium border-t border-white/15">
            <User className="h-3.5 w-3.5" />
            <span>AI-driven SOC triage simulation</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-white">
          {/* Header & Mode Selector */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'signin' ? 'Sign in to your account to continue' : 'Sign up to get started'}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Create Account Role Cards */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Register as</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('SOC_ANALYST')}
                  className={`p-3 text-left border rounded-xl transition-all flex items-start space-x-2.5 ${
                    selectedRole === 'SOC_ANALYST'
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <User className={`h-4 w-4 shrink-0 mt-0.5 ${selectedRole === 'SOC_ANALYST' ? 'text-brand-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">SOC Analyst</div>
                    <div className="text-[10px] text-slate-500">View & analyze</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('ALERT_SOURCE')}
                  className={`p-3 text-left border rounded-xl transition-all flex items-start space-x-2.5 ${
                    selectedRole === 'ALERT_SOURCE'
                      ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Send className={`h-4 w-4 shrink-0 mt-0.5 ${selectedRole === 'ALERT_SOURCE' ? 'text-brand-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Alert Source</div>
                    <div className="text-[10px] text-slate-500">Submit alerts</div>
                  </div>
                </button>
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-brand-900 font-medium">
                {selectedRole === 'SOC_ANALYST'
                  ? 'You will be able to view and analyze security alerts and incidents.'
                  : 'You will be able to submit security alerts to the SOC for processing.'}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email or Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email or username"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                {mode === 'signin' && (
                  <span className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">Forgot password?</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (6+ chars)"
                  className="w-full pl-9 pr-9 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'signup' && <span className="text-[10px] text-slate-400 mt-1 block">Min 6 characters</span>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAuthLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="text-center text-xs text-slate-500">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Dev Quick Accounts */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Dev Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  handleQuickFill('analyst', 'Analyst123!');
                }}
                className="p-2 text-left bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-brand-900 text-xs">SOC Analyst</div>
                <div className="text-[10px] text-slate-500 font-mono">analyst / Analyst123!</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  handleQuickFill('alert_source', 'Source123!');
                }}
                className="p-2 text-left bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-brand-900 text-xs">Alert Source</div>
                <div className="text-[10px] text-slate-500 font-mono">alert_source / Source123!</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
