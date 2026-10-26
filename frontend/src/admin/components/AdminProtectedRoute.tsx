import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert, ShieldCheck, ArrowLeft, LogOut, User } from 'lucide-react';

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
};

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ allowedRoles }) => {
  const navigate = useNavigate();
  const [authKey, setAuthKey] = useState('');
  const [error, setError] = useState('');

  // Check if staff session exists in localStorage
  const savedStaffStr = localStorage.getItem('staff_user');
  let currentStaff: { id: string; full_name: string; role: string; email?: string } | null = null;
  try {
    currentStaff = savedStaffStr ? JSON.parse(savedStaffStr) : null;
  } catch {
    currentStaff = null;
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(currentStaff));

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const val = authKey.trim().toLowerCase();
    if (val === 'staff_secret_key' || val === '123456' || val === 'admin') {
      const staffUser = {
        id: 'usr-admin-01',
        full_name: 'Quản Trị Viên Chuỗi',
        role: 'admin',
        email: 'admin@omniresto.vn',
      };
      localStorage.setItem('staff_user', JSON.stringify(staffUser));
      setIsAuthenticated(true);
      setError('');
    } else if (val === 'manager' || val === '654321') {
      const staffUser = {
        id: 'usr-manager-01',
        full_name: 'Lê Trần Quản Lý',
        role: 'store_manager',
        email: 'manager@omniresto.vn',
      };
      localStorage.setItem('staff_user', JSON.stringify(staffUser));
      setIsAuthenticated(true);
      setError('');
    } else if (val === 'waiter' || val === '111111' || val === 'staff') {
      const staffUser = {
        id: 'usr-waiter-01',
        full_name: 'Trần Văn Phục Vụ',
        role: 'waiter',
        email: 'waiter@omniresto.vn',
      };
      localStorage.setItem('staff_user', JSON.stringify(staffUser));
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Mã khóa bảo mật hoặc mật khẩu Quản trị không chính xác!');
    }
  };

  const handleQuickLogin = (role: 'admin' | 'store_manager' | 'waiter') => {
    const roleUsers = {
      admin: {
        id: 'usr-admin-01',
        full_name: 'Quản Trị Viên Chuỗi',
        role: 'admin',
        email: 'admin@omniresto.vn',
      },
      store_manager: {
        id: 'usr-manager-01',
        full_name: 'Lê Trần Quản Lý',
        role: 'store_manager',
        email: 'manager@omniresto.vn',
      },
      waiter: {
        id: 'usr-waiter-01',
        full_name: 'Trần Văn Phục Vụ',
        role: 'waiter',
        email: 'waiter@omniresto.vn',
      },
    };

    localStorage.setItem('staff_user', JSON.stringify(roleUsers[role]));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_user');
    setIsAuthenticated(false);
  };

  // 1. Not Authenticated → Show Login Gate
  if (!isAuthenticated || !currentStaff) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          padding: '20px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '36px 32px',
            boxShadow: 'var(--shadow-xl)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock size={32} />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '8px',
            }}
          >
            Xác Thực Quản Trị Viên HQ
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Khu vực bảo mật nội bộ của <strong>OmniResto</strong>. Vui lòng nhập mã bảo mật nhân sự (Staff Secret Key) hoặc mật khẩu quản trị để tiếp tục.
          </p>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                Mã Khóa Bảo Mật / Mật Khẩu Staff*
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Nhập STAFF_SECRET_KEY, 123456 hoặc PIN..."
                value={authKey}
                onChange={(e) => {
                  setAuthKey(e.target.value);
                  setError('');
                }}
                style={{ width: '100%', boxSizing: 'border-box', height: '44px' }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              <span>Mở Khóa Quản Trị</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Kiểm Thử Phân Quyền (RBAC)
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} color="var(--primary)" />
              <span>Đăng nhập quyền Admin Chuỗi (Toàn quyền)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('waiter')}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              <User size={16} />
              <span>Đăng nhập quyền Nhân Viên Phục Vụ (Hạn chế)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated, but Role Not Allowed → 403 Forbidden Screen
  const userRole = currentStaff.role?.toLowerCase() || 'staff';
  const isRoleAuthorized = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole);

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
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '40px 32px',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #fee2e2',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
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
            <ShieldAlert size={38} />
          </div>

          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#1e293b',
              marginBottom: '10px',
            }}
          >
            403 - Quyền Truy Cập Bị Từ Chối
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
            Bạn đang đăng nhập với tài khoản <strong>{currentStaff.full_name}</strong> có vai trò:{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {currentRoleName}
            </span>
          </p>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
              fontSize: '0.825rem',
              lineHeight: 1.5,
              textAlign: 'left',
              marginBottom: '28px',
            }}
          >
            ⚠️ Phân hệ này được bảo vệ bởi chính sách bảo mật RBAC và chỉ dành riêng cho:{' '}
            <strong>{requiredRoleNames}</strong>. Tài khoản nhân sự thông thường không có đặc quyền truy cập trang này.
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/admin')}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={16} />
              <span>Về Trang Tổng Quan</span>
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 600,
                color: '#dc2626',
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

  // 3. Authorized → Render Children / Outlet
  return <Outlet />;
};
