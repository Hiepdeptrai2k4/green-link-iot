import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, AlertCircle } from 'lucide-react';
import apiService from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1 = Request, 2 = Verify & Reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const role = await login(email, password);

      // Redirect depending on user privilege role
      if (role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    if (!forgotEmail.trim()) {
      setError('Vui lòng điền địa chỉ email.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiService.sendOtp(forgotEmail.trim());
      setForgotSuccess(res.data?.message || 'Mã OTP đã được gửi đến email của bạn.');
      setOtpStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi OTP. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    if (!otpCode.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiService.verifyOtpAndResetPassword(
        forgotEmail.trim(),
        otpCode.trim(),
        newPassword
      );
      alert(res.data?.message || 'Đặt lại mật khẩu thành công!');
      setIsForgotPassword(false);
      setOtpStep(1);
      setForgotEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setEmail(forgotEmail); // Pre-fill login field
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực OTP hoặc đặt lại mật khẩu thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-slate-900 to-emerald-950 p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 hover:border-green-500/30 font-sans">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-green-500/20 rounded-2xl mb-4 border border-green-500/30">
            <Leaf className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Green Link{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              IOT
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Smart Garden Multi-Tenant Platform</p>
        </div>

        {!isForgotPassword ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Email hoặc Tên tài khoản
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
                placeholder="Ví dụ: user@test.com hoặc tên tài khoản"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setForgotSuccess('');
                }}
                className="text-xs text-green-400 hover:text-green-300 font-semibold transition hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-lg shadow-green-950/50 hover:shadow-green-900/50 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 text-xs text-center"
              >
                Đăng ký tài khoản mới
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={otpStep === 1 ? handleSendOtp : handleVerifyOtpAndReset} className="space-y-5">
            <h2 className="text-lg font-bold text-white text-center -mt-2 mb-2">
              {otpStep === 1 ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu mới'}
            </h2>

            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center space-x-2">
                <span className="text-green-300 text-sm font-semibold">{forgotSuccess}</span>
              </div>
            )}

            {otpStep === 1 ? (
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Email khôi phục đã đăng ký
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
                  placeholder="Ví dụ: user@test.com"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Nhập mã OTP (6 số)
                  </label>
                  <input
                    type="text"
                    maxLength="6"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm font-bold tracking-widest text-center"
                    placeholder="123456"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition duration-200 text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-lg shadow-green-950/50 transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isLoading 
                  ? 'Đang xử lý...' 
                  : (otpStep === 1 ? 'Gửi mã OTP qua Email' : 'Xác thực & Đặt lại mật khẩu')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setOtpStep(1);
                  setError('');
                  setForgotSuccess('');
                }}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 text-xs text-center"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

