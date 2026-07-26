import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboard } from '../pages/dashboard/AdminDashboard';
import { BranchManagement } from '../pages/branch/BranchManagement';
import { MasterMenuManagement } from '../pages/menu/MasterMenuManagement';
import { ChainOrdersManagement } from '../pages/order/ChainOrdersManagement';
import { StaffManagement } from '../pages/auth/StaffManagement';
import { TableManagement } from '../pages/table/TableManagement';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Admin Flow */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="menu" element={<MasterMenuManagement />} />
          <Route path="orders" element={<ChainOrdersManagement />} />
          <Route path="staff" element={<StaffManagement />} />
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
