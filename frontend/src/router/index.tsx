import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Auth & Customer imports (Thêm để có trang hiển thị khi bấm nút) ─────────
import { AuthPage } from '../client/pages/auth/AuthPage';
import CustomersPage from '../admin/pages/customers';

// ── Admin imports ─────────────────────────────────────────────────────────────
import { AdminLayout } from '../admin/layouts/AdminLayout';
import { AdminDashboard } from '../admin/pages/dashboard/AdminDashboard';
import { BranchManagement } from '../admin/pages/branch/BranchManagement';
import { MasterMenuManagement } from '../admin/pages/menu/MasterMenuManagement';
import { ChainOrdersManagement } from '../admin/pages/order/ChainOrdersManagement';
import { StaffManagement } from '../admin/pages/auth/StaffManagement';
import { TableManagement } from '../admin/pages/table/TableManagement';

// ── Client imports ────────────────────────────────────────────────────────────
import { ClientLayout } from '../client/layouts/ClientLayout';
import ClientHome from '../client/pages/home/ClientHome';
import ClientMenu from '../client/pages/menu/ClientMenu';
import ClientCart from '../client/pages/cart/ClientCart';
import ClientOrderTracking from '../client/pages/order/ClientOrderTracking';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Vào web là vào thẳng Admin Dashboard theo đúng file gốc */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* 2. ADMIN FLOW: Không bọc chặn, vào thẳng quản trị */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
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

        {/* 3. CLIENT FLOW: Khách hàng xem thực đơn & đặt món */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="menu" element={<ClientMenu />} />
          <Route path="cart" element={<ClientCart />} />
          <Route path="order/:orderId" element={<ClientOrderTracking />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Route>

        {/* 4. AUTH FLOW: Chỉ mở khi người dùng chủ động bấm nút Đăng nhập / Đăng ký */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* Fallback toàn cục */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};