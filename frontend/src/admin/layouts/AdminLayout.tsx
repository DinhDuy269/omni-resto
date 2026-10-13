import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Modal } from '../../shared/components/Modal';
import { useAdminStore } from '../store/adminStore';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);
  const fetchInitialData = useAdminStore((s) => s.fetchInitialData);
  const handleWebSocketOrderEvent = useAdminStore((s) => s.handleWebSocketOrderEvent);

  // Lắng nghe cập nhật đơn hàng toàn chuỗi theo thời gian thực từ Server
  useWebSocket(handleWebSocketOrderEvent);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <div className="admin-layout">
      {/* Fixed Left Navigation Drawer */}
      <Sidebar />

      {/* Fixed Top Header */}
      <Header onQuickAction={() => setIsQuickActionModalOpen(true)} />

      {/* Main Dynamic View Outlet */}
      <main className="admin-main-content">
        <Outlet />
      </main>

      {/* Quick Action Modal */}
      <Modal
        isOpen={isQuickActionModalOpen}
        onClose={() => setIsQuickActionModalOpen(false)}
        title="Thao Tác Nhanh Hệ Thống HQ"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            className="card"
            style={{
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              borderColor: 'var(--primary)',
              backgroundColor: 'var(--primary-subtle)',
            }}
            onClick={() => {
              setIsQuickActionModalOpen(false);
              navigate('/admin/menu');
            }}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
              🍲 Thêm Món Mới
            </strong>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Cập nhật Master Menu toàn chuỗi
            </span>
          </button>

          <button
            className="card"
            style={{
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              borderColor: 'var(--info)',
              backgroundColor: 'var(--info-bg)',
            }}
            onClick={() => {
              setIsQuickActionModalOpen(false);
              navigate('/admin/tables');
            }}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--info)', display: 'block', marginBottom: '4px' }}>
              🪑 Quản Lý Sơ Đồ Bàn
            </strong>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Cập nhật và sắp xếp bàn ăn
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
