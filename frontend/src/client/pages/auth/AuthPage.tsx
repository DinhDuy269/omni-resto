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
import './AuthPage.css';

type AuthMode = 'LOGIN' | 'REGISTER';

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
  const [rememberMe, setRememberMe] = useState(true);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qMode = searchParams.get('mode')?.toUpperCase();
    if (qMode === 'REGISTER') setMode('REGISTER');
    else if (qMode === 'LOGIN') setMode('LOGIN');
  }, [searchParams]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setDateOfBirth('');
    setMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  // 1. Đăng nhập thống nhất (Tự động nhận diện Khách hàng hoặc Quản trị / Nhân sự)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const res = await authApi.login({ username: email.trim(), password });

      const token = (res as any)?.token || (res as any)?.data?.token;
      const userData = (res as any)?.data || res;
      const userRole = (userData?.role || 'customer').toLowerCase();

      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));

      if (['admin', 'store_manager', 'cashier', 'waiter', 'chef', 'staff'].includes(userRole)) {
        localStorage.setItem('staff_user', JSON.stringify(userData));
      } else {
        localStorage.setItem('customer', JSON.stringify(userData));
        localStorage.removeItem('staff_user');
      }

      setMessage({ type: 'success', text: `Đăng nhập thành công (${userData.fullName || userData.full_name})! Đang chuyển hướng...` });

      // Định tuyến thông minh:
      const redirectUrl = searchParams.get('redirect');
      let targetPath = redirectUrl;
      if (!targetPath) {
        if (['admin', 'store_manager', 'cashier', 'waiter', 'chef'].includes(userRole)) {
          targetPath = '/admin';
        } else {
          targetPath = '/client';
        }
      }

      setTimeout(() => {
        window.location.href = targetPath;
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

  // 2. Đăng ký tài khoản trực tiếp (không qua bước OTP rườm rà)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanPhone = phone.trim();
    if (!/^(0|\+84)[35789]\d{8}$/.test(cleanPhone)) {
      setMessage({ type: 'error', text: 'Số điện thoại không đúng định dạng (ví dụ: 0912345678)' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu cần tối thiểu 6 ký tự' });
      return;
    }

    if (confirmPassword !== password) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.register({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: cleanPhone,
        date_of_birth: dateOfBirth || undefined,
        password,
      });

      const token = (res as any)?.token || (res as any)?.data?.token;
      const userData = (res as any)?.data || res;
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('customer', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));

      setMessage({ type: 'success', text: 'Đăng ký tài khoản thành công! Đang chuyển hướng...' });

      const redirectUrl = searchParams.get('redirect') || '/client';
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 600);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const errorMsg =
        apiErr.response?.data?.message ||
        (apiErr.response?.data?.details ? Object.values(apiErr.response.data.details)[0] : '') ||
        'Đăng ký không thành công. Vui lòng thử lại.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* ── LEFT HALF: BANNER & THÔNG TIN NHÀ HÀNG (50%) ── */}
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
            Không gian ẩm thực sang trọng kết hợp hương vị Á - Âu chọn lọc, hỗ trợ thực khách gọi món tại bàn, đặt chỗ trước và tích điểm thành viên.
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
              <span>Hotline: 1900 6868</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT HALF: KHUNG NHẬP LIỆU (50%) ── */}
      <div className="auth-split-form-panel">
        <div className="auth-form-container">
          {/* Tab chọn Đăng nhập / Đăng ký */}
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

          {/* Tiêu đề & Mô tả */}
          <h1 className="auth-title">
            {mode === 'LOGIN' ? 'Đăng nhập' : 'Tạo tài khoản thành viên'}
          </h1>
          <p className="auth-description">
            {mode === 'LOGIN'
              ? 'Hỗ trợ đăng nhập cho cả Thực khách và Quản trị viên / Nhân sự'
              : 'Đăng ký nhanh chóng để đặt bàn, tích điểm và nhận ưu đãi'}
          </p>

          {/* Thông báo Alert */}
          {message && (
            <div className={`auth-alert-box ${message.type}`}>
              <span className="auth-alert-strong">
                {message.type === 'error' ? 'Lỗi: ' : 'Thành công: '}
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
                  placeholder="Nhập email hoặc số điện thoại"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input-control"
                  autoFocus
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

          {/* 2. FORM ĐĂNG KÝ (Trực tiếp) */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="auth-form-stack">
              <div className="auth-field-group">
                <label className="auth-label">Họ và tên*</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input-control"
                  autoFocus
                />
              </div>

              <div className="auth-field-row">
                <div className="auth-field-group">
                  <label className="auth-label">Số điện thoại*</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="auth-input-control"
                  />
                </div>

                <div className="auth-field-group">
                  <label className="auth-label">Email (tùy chọn)</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input-control"
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Ngày sinh (tùy chọn)</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="auth-input-control"
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Mật khẩu*</label>
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
                <label className="auth-label">Xác nhận mật khẩu*</label>
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
                {loading ? <span className="auth-spinner" /> : 'Đăng ký tài khoản'}
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
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
