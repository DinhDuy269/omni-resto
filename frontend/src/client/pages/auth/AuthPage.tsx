import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ArrowLeft,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  PhoneCall,
} from 'lucide-react';
import { authApi } from '../../../shared/api/authService';
import { OtpModal } from '../../../shared/components/OtpModal';
import './AuthPage.css';

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      details?: Record<string, string>;
    };
  };
}

interface AuthPageProps {
  defaultMode?: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ defaultMode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getInitialMode = (): AuthMode => {
    if (defaultMode) return defaultMode;
    const qMode = searchParams.get('mode')?.toUpperCase();
    if (qMode === 'REGISTER') return 'REGISTER';
    if (qMode === 'FORGOT' || qMode === 'FORGOT_PASSWORD') return 'FORGOT_PASSWORD';
    return 'LOGIN';
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qMode = searchParams.get('mode')?.toUpperCase();
    if (qMode === 'REGISTER') setMode('REGISTER');
    else if (qMode === 'FORGOT' || qMode === 'FORGOT_PASSWORD') setMode('FORGOT_PASSWORD');
  }, [searchParams]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setDateOfBirth('');
    setNewPassword('');
    setConfirmNewPassword('');
    setMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  // 1. Đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const res = await authApi.login({ username: email.trim(), username_or_email: email.trim(), password });

      const token = (res as any)?.token || (res as any)?.data?.token;
      const userData = (res as any)?.data || res;

      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('customer', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));

      setMessage({ type: 'success', text: 'Đăng nhập thành công. Đang chuyển hướng...' });

      const redirectUrl = searchParams.get('redirect') || '/client';
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const errorMsg =
        apiErr.response?.data?.message ||
        (apiErr.response?.data?.details ? Object.values(apiErr.response.data.details)[0] : '') ||
        'Tài khoản hoặc mật khẩu không chính xác';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // 2. Đăng ký
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanPhone = phone.trim();
    if (!/^(0|\+84)[35789]\d{8}$/.test(cleanPhone)) {
      setMessage({ type: 'error', text: 'Số điện thoại không đúng định dạng (ví dụ: 0912345678)' });
      return;
    }

    if (!dateOfBirth) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ngày sinh' });
      return;
    }

    if (new Date(dateOfBirth) >= new Date()) {
      setMessage({ type: 'error', text: 'Ngày sinh phải ở trong quá khứ' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu cần tối thiểu 6 ký tự' });
      return;
    }

    if (confirmPassword && confirmPassword !== password) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      setLoading(true);
      await authApi.sendOtp({ phone: cleanPhone, email: email.trim() });
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const errorMsg =
        apiErr.response?.data?.message ||
        (apiErr.response?.data?.details ? Object.values(apiErr.response.data.details)[0] : '') ||
        'Không thể gửi mã xác thực. Vui lòng thử lại.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // 3. Quên mật khẩu
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    if (!target) {
      setMessage({ type: 'error', text: 'Vui lòng nhập email hoặc số điện thoại' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      await authApi.sendOtp(target.includes('@') ? { email: target } : { phone: target });
      setIsOtpModalOpen(true);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Không thể gửi yêu cầu xác thực' });
    } finally {
      setLoading(false);
    }
  };

  // 4. Đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới cần tối thiểu 6 ký tự' });
      return;
    }
    if (confirmNewPassword && confirmNewPassword !== newPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const target = email.trim();
      await authApi.resetPassword({
        email: target.includes('@') ? target : undefined,
        phone: !target.includes('@') ? target : undefined,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
      setTimeout(() => {
        switchMode('LOGIN');
      }, 1200);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setMessage({ type: 'error', text: apiErr.response?.data?.message || 'Không thể đặt lại mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  // 5. Xác thực OTP thành công
  const handleOtpSuccess = async (otpCode: string) => {
    if (mode === 'REGISTER') {
      const res = await authApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth,
        password,
        otp: otpCode,
      });

      const token = (res as any)?.token || (res as any)?.data?.token;
      const userData = (res as any)?.data || res;
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('customer', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));

      setIsOtpModalOpen(false);
      setMessage({ type: 'success', text: 'Tạo tài khoản thành công. Đang chuyển hướng...' });

      const redirectUrl = searchParams.get('redirect') || '/client';
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 600);
    } else if (mode === 'FORGOT_PASSWORD') {
      setIsOtpModalOpen(false);
      setMode('RESET_PASSWORD');
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* ── LEFT HALF: RESTAURANT BANNER & INFORMATION (50%) ── */}
      <div className="auth-split-banner">
        <div className="auth-split-banner-overlay" />

        <div className="auth-banner-header">
          <div className="auth-banner-brand">
            <span className="auth-banner-brand-icon">
              <UtensilsCrossed size={22} />
            </span>
            <span>OmniResto</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/client')}
            className="auth-banner-home-btn"
          >
            <ArrowLeft size={14} />
            Trang chủ
          </button>
        </div>

        <div className="auth-banner-footer">
          <h2 className="auth-banner-title">
            Trải nghiệm ẩm thực tinh tế & gọi món thông minh
          </h2>
          <p className="auth-banner-desc">
            Không gian fine dining sang trọng kết hợp hương vị Á - Âu chọn lọc, hỗ trợ thực khách gọi món tại bàn, đặt chỗ trước và tích lũy điểm thưởng thành viên.
          </p>

          <div className="auth-restaurant-details">
            <div className="auth-detail-line">
              <span className="auth-detail-icon">
                <MapPin size={15} />
              </span>
              <span>Tầng 12, Tòa nhà Landmark, 720A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh</span>
            </div>

            <div className="auth-detail-line">
              <span className="auth-detail-icon">
                <Clock size={15} />
              </span>
              <span>Giờ mở cửa: 10:00 – 22:30 (Thứ Hai – Chủ Nhật)</span>
            </div>

            <div className="auth-detail-line">
              <span className="auth-detail-icon">
                <PhoneCall size={15} />
              </span>
              <span>Hotline đặt bàn & Chăm sóc khách hàng: 1900 6868</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT HALF: INPUT FORM (50%) ── */}
      <div className="auth-split-form-panel">
        <div className="auth-form-container">
          {/* Tab selection */}
          {(mode === 'LOGIN' || mode === 'REGISTER') && (
            <div className="auth-nav-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'LOGIN' ? 'active' : ''}`}
                onClick={() => switchMode('LOGIN')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'REGISTER' ? 'active' : ''}`}
                onClick={() => switchMode('REGISTER')}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Heading & Subtitle */}
          <h1 className="auth-title">
            {mode === 'LOGIN' && 'Đăng nhập'}
            {mode === 'REGISTER' && 'Tạo tài khoản'}
            {mode === 'FORGOT_PASSWORD' && 'Khôi phục mật khẩu'}
            {mode === 'RESET_PASSWORD' && 'Đặt lại mật khẩu'}
          </h1>
          <p className="auth-description">
            {mode === 'LOGIN' && 'Nhập thông tin tài khoản của bạn để tiếp tục'}
            {mode === 'REGISTER' && 'Đăng ký thành viên để lưu lịch sử đặt bàn và nhận ưu đãi'}
            {mode === 'FORGOT_PASSWORD' && 'Nhập email hoặc số điện thoại đã đăng ký để nhận mã OTP'}
            {mode === 'RESET_PASSWORD' && 'Nhập mật khẩu mới cho tài khoản của bạn'}
          </p>

          {/* Feedback alert */}
          {message && (
            <div className={`auth-alert-box ${message.type}`}>
              <span className="auth-alert-strong">
                {message.type === 'error' ? 'Lỗi:' : 'Thành công:'}
              </span>
              {message.text}
            </div>
          )}

          {/* 1. FORM ĐĂNG NHẬP */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="auth-form-stack">
              <div className="auth-field-group">
                <label className="auth-label">Email hoặc số điện thoại</label>
                <input
                  type="text"
                  required
                  placeholder="name@example.com hoặc 0912..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input-control"
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Mật khẩu</label>
                <div className="auth-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input-control"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-visibility"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ghi nhớ đăng nhập
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('FORGOT_PASSWORD')}
                  className="auth-text-link"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? <span className="auth-spinner" /> : 'Đăng nhập'}
              </button>

              <div className="auth-footer-help">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('REGISTER')}
                  className="auth-text-link"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          )}

          {/* 2. FORM ĐĂNG KÝ */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="auth-form-stack">
              <div className="auth-field-group">
                <label className="auth-label">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input-control"
                />
              </div>

              <div className="auth-field-row">
                <div className="auth-field-group">
                  <label className="auth-label">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input-control"
                  />
                </div>

                <div className="auth-field-group">
                  <label className="auth-label">Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="auth-input-control"
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Ngày sinh</label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="auth-input-control"
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Mật khẩu</label>
                <div className="auth-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input-control"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-visibility"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Xác nhận mật khẩu</label>
                <div className="auth-input-container">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input-control"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-toggle-visibility"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? <span className="auth-spinner" /> : 'Nhận mã OTP và đăng ký'}
              </button>

              <div className="auth-footer-help">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="auth-text-link"
                >
                  Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* 3. FORM QUÊN MẬT KHẨU */}
          {mode === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPassword} className="auth-form-stack">
              <div className="auth-field-group">
                <label className="auth-label">Email hoặc số điện thoại</label>
                <input
                  type="text"
                  required
                  placeholder="name@example.com hoặc 0912..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input-control"
                />
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? <span className="auth-spinner" /> : 'Gửi mã xác thực'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="auth-back-link-btn"
                >
                  <ArrowLeft size={14} />
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* 4. FORM ĐẶT LẠI MẬT KHẨU */}
          {mode === 'RESET_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="auth-form-stack">
              <div className="auth-field-group">
                <label className="auth-label">Mật khẩu mới</label>
                <div className="auth-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="auth-input-control"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-visibility"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Xác nhận mật khẩu mới</label>
                <div className="auth-input-container">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="auth-input-control"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-toggle-visibility"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? <span className="auth-spinner" /> : 'Lưu mật khẩu mới'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="auth-back-link-btn"
                >
                  <ArrowLeft size={14} />
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* OTP Modal */}
          <OtpModal
            isOpen={isOtpModalOpen}
            email={email}
            phone={phone}
            purpose={mode === 'REGISTER' ? 'REGISTER_VERIFICATION' : 'PASSWORD_RESET'}
            onClose={() => setIsOtpModalOpen(false)}
            onSuccess={handleOtpSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;