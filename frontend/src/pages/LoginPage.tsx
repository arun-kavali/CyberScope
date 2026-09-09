import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, AlertCircle, RefreshCw, KeyRound, Mail, Eye, EyeOff, Send, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, signup, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<'SOC_ANALYST' | 'ALERT_SOURCE'>('SOC_ANALYST');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }

      setIsSubmitting(true);
      try {
        const user = await signup({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role: selectedRole
        });
        if (user.role === 'ALERT_SOURCE') {
          navigate('/alert-source', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred during account creation. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Sign In Flow
    const loginUser = username.trim() || email.trim();
    if (!loginUser || !password.trim()) {
      setError('Please enter both email/username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({ username: loginUser, password: password.trim() });
      if (user.role === 'ALERT_SOURCE') {
        navigate('/alert-source', { replace: true });
      } else if (from && from !== '/' && !from.startsWith('/alert-source')) {
        navigate(from, { replace: true });
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
    <div className="min-h-screen w-full bg-white flex flex-col font-sans overflow-x-hidden">
      {/* Fluid Full-Viewport Split-Screen Composition */}
      <div className="w-full flex-1 min-h-screen grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT PANEL: Edge-to-Edge Branded CyberScope Visual Panel (approx 45% width on desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-700 via-emerald-800 to-teal-950 text-white p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between relative overflow-hidden min-h-[300px] lg:min-h-screen">
          {/* Subtle Decorative Background Rings */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 top-10 w-64 h-64 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-1/4 top-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Brand Identity Header */}
          <div className="space-y-6 lg:space-y-8 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="bg-white/15 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/25 shadow-sm flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <span className="text-xl lg:text-2xl font-bold text-white tracking-tight">CyberScope</span>
                <span className="block text-[10px] text-emerald-200/90 font-medium tracking-wide uppercase">Enterprise SOC Operations</span>
              </div>
            </div>

            {/* Product Value Proposition & Positioning */}
            <div className="space-y-3 lg:space-y-4 pt-4 lg:pt-8">
              <span className="inline-block text-xs font-semibold text-emerald-300 bg-white/10 px-3 py-1 rounded-full border border-white/15 backdrop-blur-xs">
                From Security Evidence to Actionable Insight
              </span>
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Protect your infrastructure, anytime, anywhere.
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal max-w-lg">
                AI-assisted cybersecurity operations platform for automated alert triage, risk scoring, anomaly detection, incident correlation, and evidence-backed response.
              </p>
            </div>
          </div>

          {/* Footer Purpose Statement */}
          <div className="pt-6 lg:pt-8 relative z-10 flex items-center space-x-2 text-[11px] text-emerald-200/80 font-medium border-t border-white/15 mt-6 lg:mt-0">
            <Cpu className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Local Offline-First Security Intelligence Engine</span>
          </div>
        </div>

        {/* RIGHT PANEL: Clean White Form Panel (approx 55% width on desktop) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-center items-center bg-white min-h-screen overflow-y-auto">
          {/* Inner Form Content: Constrained to readable width (max-w-md) for optimal ergonomics */}
          <div className="max-w-md w-full my-auto space-y-6 py-4">
            
            {/* Header Title */}
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {mode === 'signin' ? 'Sign in to your account to continue' : 'Sign up to get started with CyberScope'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 shadow-xs">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Dynamic Form: Sign In vs Sign Up */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assigned Operational Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('SOC_ANALYST')}
                        className={`p-2.5 text-left border rounded-xl transition-all flex items-center space-x-2.5 ${
                          selectedRole === 'SOC_ANALYST'
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <User className={`h-4 w-4 shrink-0 ${selectedRole === 'SOC_ANALYST' ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold">SOC Analyst</div>
                          <div className="text-[10px] text-slate-500 font-normal">Full SOC Access</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('ALERT_SOURCE')}
                        className={`p-2.5 text-left border rounded-xl transition-all flex items-center space-x-2.5 ${
                          selectedRole === 'ALERT_SOURCE'
                            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <Send className={`h-4 w-4 shrink-0 ${selectedRole === 'ALERT_SOURCE' ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold">Alert Source</div>
                          <div className="text-[10px] text-slate-500 font-normal">Submission Portal</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mode === 'signin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email or Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your email or username"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer font-medium">Forgot password?</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (6+ chars)"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isAuthLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-2 text-xs disabled:opacity-50 mt-2"
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
            <div className="text-center text-xs text-slate-500 font-medium">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* Dev Quick Credentials Helper */}
            <div className="pt-5 border-t border-slate-100 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Dev Credentials
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    handleQuickFill('analyst', 'Analyst123!');
                  }}
                  className="p-2.5 text-left bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/90 rounded-xl text-xs transition-colors group"
                >
                  <div className="font-bold text-emerald-950 text-xs group-hover:text-emerald-700">SOC Analyst</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">analyst / Analyst123!</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    handleQuickFill('alert_source', 'Source123!');
                  }}
                  className="p-2.5 text-left bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/90 rounded-xl text-xs transition-colors group"
                >
                  <div className="font-bold text-emerald-950 text-xs group-hover:text-emerald-700">Alert Source</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">alert_source / Source123!</div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
