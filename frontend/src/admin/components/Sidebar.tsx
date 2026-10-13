import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  Grid2x2,
  Users,
  BarChart3,
  Settings,
  Flame,
  Ticket, // <-- Đã thêm icon Ticket
  ChefHat,
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { orders } = useAdminStore();
  const pendingOrdersCount = orders.filter(
    (o) => o.status?.toUpperCase() === 'PENDING'
  ).length;

  const navItems = [
    {
      section: 'VẬN HÀNH NHÀ HÀNG',
      items: [
        { label: 'Tổng Quan Nhà Hàng', path: '/admin', icon: LayoutDashboard },
        { label: 'Menu & Món Ăn', path: '/admin/menu', icon: UtensilsCrossed },
        { label: 'Quản Lý Đơn Hàng', path: '/admin/orders', icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
        },
        { label: 'Sơ Đồ Bàn & Đặt Bàn', path: '/admin/tables', icon: Grid2x2 },
        { label: 'Voucher', path: '/admin/vouchers', icon: Ticket }, // <-- Đã thêm menu Voucher
        { label: 'Màn Hình Bếp (KDS)', path: '/admin/kds', icon: ChefHat },
        { label: 'Sơ Đồ Bàn', path: '/admin/tables', icon: Grid2x2 },
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

      {/* Branch & System Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ backgroundColor: '#10b981' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>Hệ Thống Trực Tuyến</span>
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
            Chi Nhánh Hoàn Kiếm • HN
          </div>
        </div>
      </div>
    </aside>
  );
};