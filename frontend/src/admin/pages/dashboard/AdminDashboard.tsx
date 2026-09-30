import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Grid2x2,
  Users,
  TrendingUp,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { orders, menuItems, tables, staffList } = useAdminStore();

  const totalRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.totalAmount, 0) || 82500000;
  const totalOrders = orders.length;
  const occupiedTablesCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const bestSellers = menuItems.filter((item) => item.isBestSeller);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Banner Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Trung Tâm Quản Trị Nhà Hàng
            </span>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
            Chào mừng trở lại, Lê Minh Tuấn 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Hệ thống OmniResto đang hoạt động ổn định và sẵn sàng phục vụ khách hàng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/menu')}>
            <UtensilsCrossed size={16} />
            Quản Lý Thực Đơn
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/tables')}>
            <Grid2x2 size={16} />
            Xem Sơ Đồ Bàn
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Grid - Spacious */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
        }}
      >
        <StatCard
          title="TỔNG DOANH THU NGÀY"
          value={`${totalRevenue.toLocaleString('vi-VN')} đ`}
          change="+18.5%"
          isPositive={true}
          icon={DollarSign}
          iconBgColor="var(--primary-subtle)"
          iconColor="var(--primary)"
          subtitle="Doanh thu thực tế trong ca"
        />
        <StatCard
          title="TỔNG ĐƠN HÀNG LIVE"
          value={totalOrders}
          change="+12.0%"
          isPositive={true}
          icon={ShoppingBag}
          iconBgColor="var(--info-bg)"
          iconColor="var(--info)"
          subtitle="Đang phục vụ tại chỗ & mang về"
        />
        <StatCard
          title="BÀN ĂN ĐANG SỬ DỤNG"
          value={`${occupiedTablesCount}/${tables.length}`}
          change={`${Math.round((occupiedTablesCount / (tables.length || 1)) * 100)}%`}
          isPositive={true}
          icon={Grid2x2}
          iconBgColor="var(--success-bg)"
          iconColor="var(--success)"
          subtitle="Công suất phục vụ hiện tại"
        />
        <StatCard
          title="NHÂN SỰ VẬN HÀNH"
          value={staffList.length}
          change="+1 ca trực"
          isPositive={true}
          icon={Users}
          iconBgColor="var(--purple-bg)"
          iconColor="var(--purple)"
          subtitle="Phân quyền theo vai trò (RBAC)"
        />
      </div>

      {/* Main Content Split: Tables Live Status & Live Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px' }}>
        {/* Left Side: Live Table Map Overview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Tình Trạng Sơ Đồ Bàn Thời Gian Thực
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Tổng quan {tables.length} bàn ăn đang hoạt động tại nhà hàng
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/tables')}
            >
              Chi tiết <ArrowRight size={15} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px' }}>
            {tables.map((table) => {
              const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                AVAILABLE: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                OCCUPIED: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                RESERVED: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
                CLEANING: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
              };
              const style = statusColors[table.status] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };

              return (
                <div
                  key={table.id}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${style.border}`,
                    backgroundColor: style.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textAlign: 'center',
                  }}
                >
                  <strong style={{ fontSize: '1rem', color: style.color }}>{table.tableNo}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{table.capacity} chỗ</span>
                  <StatusBadge status={table.status} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Live Orders Feed & Top Best Sellers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Live Orders Widget */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Đơn Hàng Mới Nhất</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/orders')}>
                Tất cả
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.slice(0, 3).map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                      {ord.orderNumber}
                    </strong>
                    <StatusBadge status={ord.status} size="sm" />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {ord.tableNo ? `Bàn: ${ord.tableNo}` : 'Mang về / Đặt online'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-body)' }}>{ord.items.length} món ăn</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.975rem' }}>
                      {ord.totalAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Dishes Widget */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={20} color="var(--success)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Món Bán Chạy Nhất (Best Sellers)</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {bestSellers.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.925rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-main)',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.category}
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.975rem', color: 'var(--primary)' }}>
                    {item.basePrice.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
