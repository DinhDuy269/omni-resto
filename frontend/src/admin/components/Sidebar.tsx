import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  Grid2x2,
  Users,
  BarChart3,
  Settings,
  Flame,
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { orders } = useAdminStore();
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  const navItems = [
    {
      section: 'VẬN HÀNH CHUỖI',
      items: [
        { label: 'Tổng Quan Hệ Thống', path: '/admin', icon: LayoutDashboard },
        { label: 'Quản Lý Chi Nhánh', path: '/admin/branches', icon: Store },
        { label: 'Master Menu & Món', path: '/admin/menu', icon: UtensilsCrossed },
        {
          label: 'Đơn Hàng Chuỗi',
          path: '/admin/orders',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
        },
        { label: 'Sơ Đồ Bàn & Đặt Bàn', path: '/admin/tables', icon: Grid2x2 },
      ],
    },
    {
      section: 'QUẢN TRỊ & PHÂN TÍCH',
      items: [
        { label: 'Nhân Sự & Phân Quyền', path: '/admin/staff', icon: Users },
        { label: 'Báo Cáo Doanh Thu', path: '/admin/reports', icon: BarChart3 },
        { label: 'Cấu Hình Hệ Thống', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Flame size={24} />
        </div>
        <div>
          <span className="sidebar-brand-title">OmniResto</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="sidebar-section-title">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      style={{
                        backgroundColor: 'var(--danger)',
                        color: '#ffffff',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};
