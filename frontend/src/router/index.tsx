import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../client/pages/login';  // [THÊM] cạnh import RegisterPage


// ── Auth & User Management imports ──────────────────────────────────────────
import { AuthPage } from '../client/pages/auth/AuthPage';
import { UserManagementPage } from "../client/pages/users/UserManagementPage";
// ── Admin imports ─────────────────────────────────────────────────────────────
import { AdminLayout } from '../admin/layouts/AdminLayout';
import { AdminDashboard } from '../admin/pages/dashboard/AdminDashboard';
import { BranchManagement } from '../admin/pages/branch/BranchManagement';
import { MasterMenuManagement } from '../admin/pages/menu/MasterMenuManagement';
import { ChainOrdersManagement } from '../admin/pages/order/ChainOrdersManagement';
import { StaffManagement } from '../admin/pages/auth/StaffManagement';
import  CustomersPage  from "../admin/pages/customers";

import { TableManagement } from '../admin/pages/table/TableManagement';

// ── Client imports ────────────────────────────────────────────────────────────
import { ClientLayout } from '../client/layouts/ClientLayout';
import ClientHome from '../client/pages/home/ClientHome';
import ClientMenu from '../client/pages/menu/ClientMenu';
import ClientCart from '../client/pages/cart/ClientCart';
import ClientOrderTracking from '../client/pages/order/ClientOrderTracking';
 
import RegisterPage from '../client/pages/register';

// ── Component Bảo vệ Route dành cho Admin ────────────────────────────────────
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/auth" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
      return <Navigate to="/client" replace />;
    }
  } catch (e) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect → Auth hoặc Admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* ══════════════════════════════════════════════════
            AUTHENTICATION FLOW (Đăng nhập, Đăng ký, Quên MK)
            ══════════════════════════════════════════════════ */}
        <Route path="/auth" element={<AuthPage />} />

        {/* ══════════════════════════════════════════════════
            ADMIN FLOW — Enterprise management interface
            ══════════════════════════════════════════════════ */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="menu" element={<MasterMenuManagement />} />
          <Route path="orders" element={<ChainOrdersManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="tables" element={<TableManagement />} />
          <Route
            path="reports"
            element={
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <h2>📊 Báo Cáo & Phân Tích Doanh Thu Chuỗi</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                  Module báo cáo chuyên sâu đang được kết nối với dữ liệu Spring Boot Backend.
                </p>
              </div>
            }
          />
          <Route
            path="settings"
            element={
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <h2>⚙️ Cấu Hình Hệ Thống HQ</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                  Cấu hình VAT, Phí dịch vụ, Cổng thanh toán QR Code và Email tự động.
                </p>
              </div>
            }
          />
        </Route>

        {/* ══════════════════════════════════════════════════
            CLIENT FLOW — Customer-facing ordering interface
            ══════════════════════════════════════════════════ */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="menu" element={<ClientMenu />} />
          <Route path="cart" element={<ClientCart />} />
          <Route path="order/:orderId" element={<ClientOrderTracking />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
          
        </Route>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Global fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};