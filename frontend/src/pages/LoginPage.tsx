import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, AlertCircle, ArrowRight, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Branding Panel (Box #1 in Reference Image) */}
        <div className="bg-brand-900 text-white p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-brand-950 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-flex bg-emerald-600 text-white p-3.5 rounded-2xl shadow-md border border-emerald-500/40">
              <Shield className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">CyberScope</h1>
              <p className="text-xs text-emerald-200/90 font-semibold uppercase tracking-wider">
                From Security Evidence to Actionable Insight
              </p>
            </div>

            <p className="text-xs text-emerald-100/70 leading-relaxed max-w-sm pt-2">
              AI-powered evidence-grounded cybersecurity intelligence for modern SOC teams.
            </p>
          </div>

          <div className="pt-8 border-t border-brand-800 space-y-2 relative z-10 text-xs text-emerald-200/80">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Protected, Intelligent, Always On.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Smarter Security. Safer Tomorrow.</span>
            </div>
          </div>
        </div>

        {/* Right Sign In Form Panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">Sign in to your CyberScope account to proceed.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
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
                  placeholder="Enter your username"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
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
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAuthLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
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

          {/* Quick Dev Credentials */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Dev Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('analyst', 'Analyst123!')}
                className="p-2 text-left bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-brand-900 text-xs">SOC Analyst</div>
                <div className="text-[10px] text-slate-500 font-mono">analyst / Analyst123!</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('alert_source', 'Source123!')}
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
