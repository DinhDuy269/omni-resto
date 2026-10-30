import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

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
  const location = useLocation();

  // Đọc phiên đăng nhập thực tế từ localStorage (đồng bộ giữa client và admin)
  const getUserFromStorage = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const userStr = localStorage.getItem('staff_user') || localStorage.getItem('user');
      if (!userStr) return null;
      const parsed = JSON.parse(userStr);
      return parsed;
    } catch {
      return null;
    }
  };

  const currentUser = getUserFromStorage();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('staff_user');
    localStorage.removeItem('customer');
    window.location.href = '/auth';
  };

  // 1. Chưa đăng nhập → Chuyển hướng ngay tới trang đăng nhập chung (/auth) kèm redirect URL
  if (!currentUser) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirectUrl}`} replace />;
  }

  // 2. Nếu tài khoản là Customer (không thuộc nhóm nhân viên) → 403 Forbidden
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
              onClick={() => { window.location.href = '/client'; }}
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
              onClick={() => { window.location.href = '/admin'; }}
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
