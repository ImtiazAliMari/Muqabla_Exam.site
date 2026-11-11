import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, GraduationCap, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
  confirmationNotice?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  confirmationNotice,
}) => {
  const { login, signUp, resendVerificationEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('Punjab');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResend = async () => {
    if (!unconfirmedEmail && !email.trim()) return;
    const targetEmail = (unconfirmedEmail || email).trim();
    setIsResending(true);
    setResendStatus(null);
    const res = await resendVerificationEmail(targetEmail);
    setIsResending(false);
    if (res.success) {
      setResendStatus('Link sent! Check your email inbox.');
    } else {
      setResendStatus(res.error || 'Failed to resend. Try again shortly.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setResendStatus(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      const errMsg = res.error || '';
      if (errMsg.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(email.trim());
        setError('Email address not confirmed. Please check your inbox and confirm your email before logging in.');
      } else {
        setUnconfirmedEmail(null);
        setError(errMsg || 'Invalid credentials or user does not exist.');
      }
      return;
    }

    setUnconfirmedEmail(null);
    setSuccessMsg('Authenticated successfully!');
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 500);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setResendStatus(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(email, password, name, province);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Registration failed.');
      return;
    }

    if (res.requiresEmailConfirmation) {
      setUnconfirmedEmail(email.trim());
      setSuccessMsg(`Registration successful! We sent a confirmation link to ${email}. Please check your email inbox and click "Confirm email address" before logging in.`);
      setMode('login');
      return;
    }

    setSuccessMsg('Account registered successfully! Welcome to Muqabla.');
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {mode === 'login' ? <Lock className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Sign In to Muqabla' : 'Candidate Registration'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Access your competitive percentile, ranking band, and followed exams'
              : 'Join thousands of Pakistani exam aspirants across all provinces'}
          </p>
        </div>

        {/* Confirmation & Notification Banners */}
        {confirmationNotice && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5 animate-pulse">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Email Confirmed!</p>
              <p className="text-emerald-200/90 mt-0.5">{confirmationNotice}</p>
            </div>
          </div>
        )}

        {unconfirmedEmail && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold text-amber-300">Email Confirmation Required</p>
                <p className="text-amber-200/90 leading-relaxed">
                  We sent a confirmation link to <strong className="text-white">{unconfirmedEmail}</strong>. Please check your inbox and click <strong className="text-emerald-300">Confirm email address</strong>.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResend}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Resend Confirmation Email
                  </button>
                  {resendStatus && <span className="text-[11px] text-emerald-300 font-medium">({resendStatus})</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !unconfirmedEmail && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !confirmationNotice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name / Candidate Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Province / Domicile
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh (Rural)">Sindh (Rural)</option>
                  <option value="Sindh (Urban)">Sindh (Urban)</option>
                  <option value="KPK">Khyber Pakhtunkhwa (KPK)</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Islamabad">Islamabad (ICT)</option>
                  <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                  <option value="AJK">Azad Jammu & Kashmir (AJK)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-emerald-950"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : mode === 'login' ? (
              <>
                <span>Sign In to Muqabla</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Create Candidate Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-slate-800/80">
          {mode === 'login' ? (
            <p>
              New candidate on Muqabla?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-emerald-400 hover:underline cursor-pointer"
              >
                Register an account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-emerald-400 hover:underline cursor-pointer"
              >
                Sign in to your account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
