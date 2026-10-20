import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ── Admin imports ─────────────────────────────────────────────────────────────
import { AdminLayout } from '../admin/layouts/AdminLayout';
import { AdminDashboard } from '../admin/pages/dashboard/AdminDashboard';
import { MasterMenuManagement } from '../admin/pages/menu/MasterMenuManagement';
import { ChainOrdersManagement } from '../admin/pages/order/ChainOrdersManagement';
import { StaffManagement } from '../admin/pages/auth/StaffManagement';
import { TableManagement } from '../admin/pages/table/TableManagement';
import { KitchenDisplaySystem } from '../admin/pages/kds/KitchenDisplaySystem';

import ReservationManagement from '../pages/admin/ReservationManagement';

// ── Client imports ────────────────────────────────────────────────────────────
import { ClientLayout } from '../client/layouts/ClientLayout';
import ClientHome from '../client/pages/home/ClientHome';
import ClientMenu from '../client/pages/menu/ClientMenu';
import ClientCart from '../client/pages/cart/ClientCart';
import ClientOrderTracking from '../client/pages/order/ClientOrderTracking';
import ClientOrdersPage from '../client/pages/order/ClientOrdersPage';
import ClientEvents from '../client/pages/events/ClientEvents';
import ClientAbout from '../client/pages/about/ClientAbout';
import ClientCheckIn from '../client/pages/scan/ClientCheckIn';
import { VnPayReturn } from '../client/pages/payment/VnPayReturn';
import { VoucherManagement } from '../admin/pages/voucher/VoucherManagement';
import CustomersPage from '../admin/pages/customers';
import ClientGacha from '../client/pages/gacha/ClientGacha';
import { AuthPage } from '../client/pages/auth/AuthPage';
import LoginPage from '../client/pages/login';
import RegisterPage from '../client/pages/register';

/** Normalizes uppercase or mixed-case paths (e.g. /Client -> /client) seamlessly */
const PathCaseNormalizer: React.FC = () => {
  const location = useLocation();
  const lowerPath = location.pathname.toLowerCase();
  if (location.pathname !== lowerPath) {
    return <Navigate to={lowerPath + location.search + location.hash} replace />;
  }
  return null;
};

import ReservationPage from '../pages/customer/ReservationPage';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <PathCaseNormalizer />
      <Routes>
        {/* Root redirect → Admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* ══════════════════════════════════════════════════
            ADMIN FLOW — Enterprise management interface
            ══════════════════════════════════════════════════ */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="menu" element={<MasterMenuManagement />} />
          <Route path="orders" element={<ChainOrdersManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="tables" element={<TableManagement />} />
          <Route path="reservations" element={<ReservationManagement />} />
          <Route path="kds" element={<KitchenDisplaySystem />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="customers" element={<CustomersPage />} />
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
          <Route path="orders" element={<ClientOrdersPage />} />
          <Route path="gacha" element={<ClientGacha />} />
          <Route path="order/:orderId" element={<ClientOrderTracking />} />
          {/* Route Khách hàng đặt bàn trực tuyến */}
          <Route path="reservation" element={<ReservationPage />} />
          <Route path="dat-ban" element={<ReservationPage />} />
          <Route path="events" element={<ClientEvents />} />
          <Route path="about" element={<ClientAbout />} />
          <Route path="scan" element={<ClientCheckIn />} />
          <Route path="table/:token" element={<ClientCheckIn />} />
          <Route path="payment/vnpay-return" element={<VnPayReturn />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Route>

        {/* ══════════════════════════════════════════════════
            AUTH FLOW — Customer Login, Register, OTP
            ══════════════════════════════════════════════════ */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Global fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
