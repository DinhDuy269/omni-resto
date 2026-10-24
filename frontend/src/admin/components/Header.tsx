import React, { useState } from 'react';
import { Bell, Store, Calendar, ChevronDown, User, Package, LogOut, HelpCircle, Zap } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { useAdminStore } from '../store/adminStore';
import './Header.css';

interface HeaderProps {
  onQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAction }) => {
  const { service_requests, resolveServiceRequest, clearAllServiceRequests, orders } = useAdminStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const openRequests = service_requests.filter((r) => r.status === 'OPEN');
  const recentOrders = orders.slice(0, 3);

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
        {/* Left: Restaurant Info & Status */}
        <div className="header-left">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: 'var(--text-main)',
            }}
          >
            <Store size={16} color="var(--primary)" />
            <span>Hệ Thống Nhà Hàng OmniResto</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--success)',
            }}
          >
            <span className="pulse-dot" style={{ backgroundColor: 'var(--success)' }} />
            Realtime Sync
          </div>
        </div>

        {/* Right: Date, Notifications, Quick Actions & User Profile Dropdown */}
        <div className="header-right">
          {onQuickAction && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onQuickAction}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              title="Phím tắt thao tác nhanh toàn hệ thống"
            >
              <Zap size={14} />
              <span>Thao Tác Nhanh</span>
            </button>
          )}

          <div className="date-badge">
            <Calendar size={15} color="var(--primary)" />
            <span>{todayStr}</span>
          </div>

          {/* Notifications */}
          <div className="icon-btn-wrapper">
            <button
              className="btn btn-secondary btn-icon"
              style={{ position: 'relative' }}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
              }}
              title="Thông báo phục vụ & đơn mới"
            >
              <Bell size={18} />
              {openRequests.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  {openRequests.length}
                </span>
              )}
            </button>
            {openRequests.length === 0 && <span className="notification-dot" />}

            {showNotifications && (
              <div
                className="card animate-fade-in"
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '360px',
                  zIndex: 200,
                  boxShadow: 'var(--shadow-xl)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>
                    Yêu cầu phục vụ & Thông báo ({openRequests.length})
                  </strong>
                  {openRequests.length > 0 && (
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => clearAllServiceRequests()}
                    >
                      Xử lý tất cả
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                  {openRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      ✨ Không có yêu cầu phục vụ nào đang chờ xử lý
                    </div>
                  ) : (
                    openRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {req.table_no}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{req.timestamp}</span>
                          </div>
                          <div style={{ fontWeight: 600, color: '#991b1b' }}>{req.request_text}</div>
                        </div>

                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            whiteSpace: 'nowrap',
                            alignSelf: 'center',
                          }}
                          onClick={() => resolveServiceRequest(req.id)}
                        >
                          ✓ Đã phục vụ
                        </button>
                      </div>
                    ))
                  )}

                  {/* Recent Orders info */}
                  {recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--primary-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <strong>Đơn mới {ord.order_number}:</strong> {ord.items.length} món • {ord.table_no || 'Mang về'} ({ord.total_amount.toLocaleString('vi-VN')}đ)
                    </div>
                  ))}
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
