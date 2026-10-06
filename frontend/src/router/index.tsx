import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
import { VoucherManagement } from '../admin/pages/voucher/VoucherManagement';
import ClientGacha from '../client/pages/gacha/ClientGacha';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect → Admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* ══════════════════════════════════════════════════
            ADMIN FLOW — Enterprise management interface
            ══════════════════════════════════════════════════ */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="menu" element={<MasterMenuManagement />} />
          <Route path="orders" element={<ChainOrdersManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="tables" element={<TableManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
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
          <Route path="gacha" element={<ClientGacha />} /> {/* <--- Thêm dòng này */}
          <Route path="order/:orderId" element={<ClientOrderTracking />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Route>

        {/* Global fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

