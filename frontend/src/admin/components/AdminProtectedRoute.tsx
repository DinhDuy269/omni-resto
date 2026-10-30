import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert, ArrowLeft, LogOut, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../shared/api/authService';

interface AdminProtectedRouteProps {
  allowedRoles?: string[];
}

const ROLE_NAME_MAP: Record<string, string> = {
  admin: 'Quản Trị Viên Chuỗi (Admin)',
  store_manager: 'Quản Lý Cửa Hàng (Store Manager)',
  cashier: 'Thu Ngân Quầy (Cashier)',
  waiter: 'Nhân Viên Phục Vụ (Waiter)',
  chef: 'Đầu Bếp Chi Nhánh (Chef)',
  staff: 'Nhân Viên Vận Hành (Staff)',
  customer: 'Khách Hàng',
};

const STAFF_ROLES = ['admin', 'store_manager', 'cashier', 'waiter', 'chef', 'staff'];

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ allowedRoles }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Đọc phiên đăng nhập thực tế từ localStorage (đồng bộ giữa client và admin)
  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('staff_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(getUserFromStorage());

  // Xử lý đăng nhập thực tế qua API backend
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginUser = username.trim();
    const loginPass = password;

    if (!loginUser || !loginPass) {
      setError('Vui lòng nhập tài khoản và mật khẩu!');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await authApi.login({ username: loginUser, password: loginPass });
      const role = (res.role || '').toLowerCase();

      if (!STAFF_ROLES.includes(role)) {
        setError('Tài khoản này là Khách Hàng, không có quyền truy cập hệ thống Quản trị!');
        return;
      }

      // Lưu token và thông tin phiên thực tế vào localStorage
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      localStorage.setItem('user', JSON.stringify(res));
      localStorage.setItem('staff_user', JSON.stringify(res));

      setCurrentUser(res);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Tài khoản hoặc mật khẩu không chính xác!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('staff_user');
    setCurrentUser(null);
  };

  // 1. Chưa đăng nhập → Hiển thị form Đăng Nhập Quản Trị thật
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '20px',
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '36px 32px',
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={26} />
          </div>

          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '6px',
              textAlign: 'center',
            }}
          >
            Đăng Nhập Cổng Quản Trị
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '22px', textAlign: 'center', lineHeight: 1.5 }}>
            Vui lòng nhập tài khoản nhân sự hoặc quản trị để tiếp tục.
          </p>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '18px',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRealLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Email hoặc Số điện thoại*
              </label>
              <input
                type="text"
                placeholder="Nhập email hoặc số điện thoại"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                }}
                autoFocus
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Mật khẩu*
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '42px',
                    padding: '0 40px 0 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.925rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '4px',
              }}
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/client')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Quay về trang thực khách</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Nếu tài khoản là Customer → 403 Forbidden
  const userRole = (currentUser.role || '').toLowerCase();
  if (!STAFF_ROLES.includes(userRole)) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            padding: '40px 32px',
            textAlign: 'center',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #fee2e2',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid #fecaca',
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
            403 - Giới Hạn Quyền Truy Cập
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
            Bạn đang đăng nhập bằng tài khoản <strong>{currentUser.fullName || currentUser.full_name}</strong> với vai trò: <strong>Khách Hàng</strong>. Khu vực này chỉ dành cho nhân sự và quản trị viên nhà hàng.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/client')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 700,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Về Trang Thực Khách</span>
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 600,
                color: '#dc2626',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              <span>Đổi Tài Khoản Quản Trị</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Kiểm tra quyền role cụ thể nếu trang yêu cầu (ví dụ: chỉ Admin hoặc Manager)
  const isRoleAuthorized = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole) || userRole === 'admin';

  if (!isRoleAuthorized) {
    const currentRoleName = ROLE_NAME_MAP[userRole] || userRole;
    const requiredRoleNames = allowedRoles.map((r) => ROLE_NAME_MAP[r] || r).join(' hoặc ');

    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '40px 32px',
            textAlign: 'center',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #fee2e2',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid #fecaca',
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
            403 - Quyền Truy Cập Bị Từ Chối
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
            Bạn đang đăng nhập với tài khoản <strong>{currentUser.fullName || currentUser.full_name}</strong> ({currentRoleName}). Trang này yêu cầu quyền: <strong>{requiredRoleNames}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 700,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Về Bảng Điều Khiển</span>
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 600,
                color: '#dc2626',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              <span>Đổi Tài Khoản</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Hợp lệ → Render các trang con (Admin Layout & Outlet)
  return <Outlet />;
};
