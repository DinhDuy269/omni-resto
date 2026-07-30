import React, { useState } from 'react';
import { Bell, Store, Calendar, ChevronDown, User, Package, LogOut, HelpCircle } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { Modal } from '../../shared/components/Modal';
import './Header.css';

interface HeaderProps {
  onQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { branches, selectedBranchId, setSelectedBranchId } = useAdminStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleLogout = () => {
    setShowProfileDropdown(false);
    window.location.reload();
  };

  return (
    <>
      <header className="header">
        {/* Left: Branch Selector Only */}
        <div className="header-left">
          <div className="branch-selector-wrapper">
            <Store size={16} color="var(--primary)" />
            <span className="branch-selector-label">Chi nhánh:</span>
            <select
              className="branch-selector"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="ALL">Tất cả Chi Nhánh (Trụ Sở HQ)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} color="var(--primary)" />
          </div>
        </div>

        {/* Right: Date, Notifications & User Profile Dropdown */}
        <div className="header-right">
          <div className="date-badge">
            <Calendar size={15} color="var(--primary)" />
            <span>{todayStr}</span>
          </div>

          {/* Notifications */}
          <div className="icon-btn-wrapper">
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
              }}
              title="Thông báo hệ thống"
            >
              <Bell size={18} />
            </button>
            <span className="notification-dot" />

            {showNotifications && (
              <div
                className="card animate-fade-in"
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '320px',
                  zIndex: 200,
                  boxShadow: 'var(--shadow-xl)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Thông báo mới (2)</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}>Đã đọc tất cả</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--primary-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <strong>Đơn hàng mới:</strong> ORD-HCM-9022 vừa được tạo tại Chi nhánh Quận 1.
                  </div>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--warning-bg)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <strong>Cảnh báo kho:</strong> Món "Chè Hạt Sen" tạm thời hết hàng ở Hoàn Kiếm.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rightmost: User Profile Badge with Dropdown */}
          <div className="profile-dropdown-wrapper">
            <button
              className="user-profile-btn"
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
            >
              <div className="user-avatar-circle">LT</div>
              <span className="user-profile-name">Lê Minh Tuấn</span>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {showProfileDropdown && (
              <div className="user-profile-dropdown animate-fade-in">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    setShowProfileModal(true);
                  }}
                >
                  <User size={16} color="var(--primary)" />
                  <span>Tài khoản của bạn</span>
                </button>

                <button
                  className="dropdown-item"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <Package size={16} color="var(--purple)" />
                  <span>Gói dịch vụ HQ</span>
                </button>

                <button
                  className="dropdown-item"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <HelpCircle size={16} color="var(--info)" />
                  <span>Cập nhật CCCD / Hướng dẫn</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Thông Tin Tài Khoản Quản Trị"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#ffffff', fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              LT
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>Lê Minh Tuấn</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 700 }}>
                Admin Chuỗi HQ (Quản Lý Cao Nhất)
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>minhtuan.le@omniresto.vn</p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mã Quản Trị Viên:</span>
              <strong>HQ-ADM-001</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phân Quyền Hệ Thống:</span>
              <strong style={{ color: 'var(--success)' }}>Full Control (Toàn Chuỗi)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ngày Tham Gia:</span>
              <strong>01/01/2026</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setShowProfileModal(false)}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
