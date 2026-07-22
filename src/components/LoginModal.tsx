import React, { useState, useEffect } from 'react';
import { Home, User } from '../types';
import { Building2, KeyRound, Shield, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  homes: Home[];
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, homes }) => {
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [email, setEmail] = useState('staff@videotrain.com');
  const [username, setUsername] = useState('staff_john');
  const [selectedHomeId, setSelectedHomeId] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot / OTP state
  const [showOtpView, setShowOtpView] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (homes.length > 0) {
      setSelectedHomeId(homes[0].id);
    }
  }, [homes]);

  const handleRoleChange = (newRole: 'staff' | 'admin') => {
    setRole(newRole);
    setError(null);
    if (newRole === 'admin') {
      setEmail('admin@videotrain.com');
      setUsername('admin');
    } else {
      setEmail('staff@videotrain.com');
      setUsername('staff_john');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          role,
          homeId: selectedHomeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!otpEmail) {
      setError('Please enter your email to receive OTP');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');

      setGeneratedOtp(data.otpCode);
      setOtpSuccessMsg(`OTP sent successfully! Your code is ${data.otpCode}. Username: ${data.username}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp) {
      setError('Please enter the OTP code');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail.trim(),
          otpCode: enteredOtp.trim(),
          newPassword: newPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      setOtpSuccessMsg(`Account verified! Username: ${data.username}. You can now log in.`);
      setTimeout(() => {
        setEmail(data.email);
        setUsername(data.username);
        setShowOtpView(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-200">
            V
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Staff VideoTrain</h2>
            <p className="text-xs text-slate-500">Authorized Staff & Admin Portal</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {otpSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-700 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{otpSuccessMsg}</span>
          </div>
        )}

        {!showOtpView ? (
          <>
            {/* Role Switcher */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => handleRoleChange('staff')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'staff'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Staff (Trainee)
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@videotrain.com"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="staff_john"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Verify Work Location (Home)</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Strict Verification</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedHomeId}
                    onChange={(e) => setSelectedHomeId(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900 appearance-none font-medium"
                  >
                    {homes.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowOtpView(true)}
                  className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Forgot credentials / OTP recovery?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : `Login as ${role === 'admin' ? 'Admin' : 'Staff'}`}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Demo Accounts Available:
              </p>
              <div className="mt-2 flex gap-2 justify-center text-[11px] text-slate-600 font-mono">
                <span className="bg-slate-100 px-2 py-1 rounded-md">staff@videotrain.com / staff_john (Hasset Home)</span>
              </div>
            </div>
          </>
        ) : (
          /* OTP Recovery View */
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Credential Retrieval with OTP</h3>
            <p className="text-xs text-slate-500">
              Enter your registered email address to generate an OTP code.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Staff Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="staff@videotrain.com"
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shrink-0 shadow-md shadow-indigo-200"
                >
                  Send OTP
                </button>
              </div>
            </div>

            {generatedOtp && (
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <span className="text-xs text-indigo-700 uppercase font-bold tracking-wider block">Generated OTP</span>
                <span className="text-2xl font-mono font-black text-indigo-600">{generatedOtp}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Enter OTP Code
              </label>
              <input
                type="text"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="6-digit code"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono tracking-widest text-center"
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-200"
            >
              Verify OTP & Retrieve Login
            </button>

            <button
              type="button"
              onClick={() => setShowOtpView(false)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
