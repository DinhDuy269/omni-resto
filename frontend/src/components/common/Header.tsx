import React, { useState } from 'react';
import { Search, Bell, Store, Calendar, Plus, ChevronDown } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import './Header.css';

interface HeaderProps {
  onQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAction }) => {
  const { branches, selectedBranchId, setSelectedBranchId } = useAdminStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="header">
      {/* Left: Branch Selector & Search */}
      <div className="header-left">
        <div className="branch-selector-wrapper">
          <Store size={18} color="var(--primary)" />
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

        <div className="search-bar">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm món ăn, đơn hàng, chi nhánh..."
          />
        </div>
      </div>

      {/* Right: Date, Notifications & Action */}
      <div className="header-right">
        <div className="date-badge">
          <Calendar size={15} color="var(--primary)" />
          <span>{todayStr}</span>
        </div>

        {/* Notifications */}
        <div className="icon-btn-wrapper">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Thông báo hệ thống"
          >
            <Bell size={19} />
          </button>
          <span className="notification-dot" />

          {/* Notifications Dropdown Popover */}
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

        {/* Quick Action Button */}
        <button className="btn btn-primary" onClick={onQuickAction}>
          <Plus size={18} />
          <span>Tạo Đơn Hàng / Món</span>
        </button>
      </div>
    </header>
  );
};
