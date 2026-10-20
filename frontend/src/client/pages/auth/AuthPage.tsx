import React, { useState } from 'react';
import { authApi } from '../../../shared/api/authService';
import { OtpModal } from '../../../shared/components/OtpModal';
import './AuthPage.css';

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifiedOtpCode, setVerifiedOtpCode] = useState('');

  // UI / Modal States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setNewPassword('');
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const res = await authApi.login({ usernameOrEmail: email, password });
      
      // 1. Lưu phiên đăng nhập người dùng vào localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      setMessage({ type: 'success', text: 'Đăng nhập thành công!' });
      
      // 2. Chuyển hướng thẳng về trang /client (không vào Admin)
      setTimeout(() => {
        window.location.href = '/client';
      }, 700);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Đăng nhập thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      await authApi.register({ fullName, email, phone, password });
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Đăng ký thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      await authApi.forgotPassword({ email });
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Không thể gửi yêu cầu' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      await authApi.resetPassword({ email, otpCode: verifiedOtpCode, newPassword });
      setMessage({ type: 'success', text: 'Mật khẩu đã được cập nhật! Vui lòng đăng nhập.' });
      setTimeout(() => {
        resetForm();
        setMode('LOGIN');
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Đặt lại mật khẩu thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = (otpCode: string) => {
    setIsOtpModalOpen(false);
    if (mode === 'REGISTER') {
      setMessage({ type: 'success', text: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập.' });
      resetForm();
      setMode('LOGIN');
    } else if (mode === 'FORGOT_PASSWORD') {
      setVerifiedOtpCode(otpCode);
      setMode('RESET_PASSWORD');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          {mode === 'LOGIN' && 'Đăng Nhập OmniResto'}
          {mode === 'REGISTER' && 'Đăng Ký Tài Khoản'}
          {mode === 'FORGOT_PASSWORD' && 'Quên Mật Khẩu'}
          {mode === 'RESET_PASSWORD' && 'Đặt Lại Mật Khẩu Mới'}
        </h2>

        {message && (
          <div className={`auth-alert ${message.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`}>
            {message.text}
          </div>
        )}

        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email / Số điện thoại</label>
              <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => { resetForm(); setMode('FORGOT_PASSWORD'); }} className="auth-btn-link">
                Quên mật khẩu?
              </button>
            </div>
            <button type="submit" disabled={loading} className="auth-btn-submit">
              {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
            </button>
            <p className="auth-footer-text">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => { resetForm(); setMode('REGISTER'); }} className="auth-btn-link">
                Đăng ký ngay
              </button>
            </p>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label className="form-label">Họ và Tên</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Số Điện Thoại</label>
              <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Mật Khẩu</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" />
            </div>
            <button type="submit" disabled={loading} className="auth-btn-submit">
              {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
            </button>
            <p className="auth-footer-text">
              Đã có tài khoản?{' '}
              <button type="button" onClick={() => { resetForm(); setMode('LOGIN'); }} className="auth-btn-link">
                Đăng nhập
              </button>
            </p>
          </form>
        )}

        {mode === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Nhập Email Đã Đăng Ký</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <button type="submit" disabled={loading} className="auth-btn-submit">
              {loading ? 'Đang gửi...' : 'Gửi Mã Xác Nhận OTP'}
            </button>
            <div className="auth-footer-text">
              <button type="button" onClick={() => { resetForm(); setMode('LOGIN'); }} className="auth-btn-link">
                Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}

        {mode === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Mật Khẩu Mới</label>
              <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" />
            </div>
            <button type="submit" disabled={loading} className="auth-btn-submit">
              {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        )}

        <OtpModal
          isOpen={isOtpModalOpen}
          email={email}
          purpose={mode === 'REGISTER' ? 'REGISTER_VERIFICATION' : 'PASSWORD_RESET'}
          onClose={() => setIsOtpModalOpen(false)}
          onSuccess={handleOtpSuccess}
        />
      </div>
    </div>
  );
};