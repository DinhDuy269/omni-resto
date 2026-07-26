import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Store,
  Users,
  TrendingUp,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { branches, orders, menuItems, selectedBranchId } = useAdminStore();

  // Filter calculations based on selected branch
  const filteredBranches = selectedBranchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === selectedBranchId);

  const totalRevenue = filteredBranches.reduce((sum, b) => sum + b.dailyRevenue, 0);
  const totalOrders = orders.length;
  const activeBranchesCount = branches.filter((b) => b.status === 'ACTIVE').length;
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
              Hệ Thống Trụ Sở Chính (HQ)
            </span>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
            Chào mừng trở lại, Lê Minh Tuấn 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Hệ thống OmniResto đang hoạt động ổn định trên {activeBranchesCount}/{branches.length} chi nhánh toàn quốc.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/menu')}>
            <UtensilsCrossed size={16} />
            Quản Lý Thực Đơn
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/branches')}>
            <Store size={16} />
            Xem Chi Nhánh
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
          subtitle="So với cùng thời điểm hôm qua"
        />
        <StatCard
          title="TỔNG ĐƠN HÀNG LIVE"
          value={totalOrders}
          change="+12.0%"
          isPositive={true}
          icon={ShoppingBag}
          iconBgColor="var(--info-bg)"
          iconColor="var(--info)"
          subtitle="Đang xử lý trên toàn chuỗi"
        />
        <StatCard
          title="CHI NHÁNH HOẠT ĐỘNG"
          value={`${activeBranchesCount}/${branches.length}`}
          change="100%"
          isPositive={true}
          icon={Store}
          iconBgColor="var(--success-bg)"
          iconColor="var(--success)"
          subtitle="1 chi nhánh đang bảo trì"
        />
        <StatCard
          title="NHÂN SỰ VẬN HÀNH"
          value="48"
          change="+4 người"
          isPositive={true}
          icon={Users}
          iconBgColor="var(--purple-bg)"
          iconColor="var(--purple)"
          subtitle="Phân quyền theo vai trò (RBAC)"
        />
      </div>

      {/* Main Content Split: Branch Revenues & Live Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px' }}>
        {/* Left Side: Branch Performance & Comparison */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Hiệu Suất Chi Nhánh Theo Thời Gian Thực
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Doanh thu và trạng thái đơn hàng của các điểm bán
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/branches')}
            >
              Chi tiết <ArrowRight size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredBranches.map((branch) => {
              const maxRevenue = 40000000;
              const percent = Math.min(100, Math.round((branch.dailyRevenue / maxRevenue) * 100));

              return (
                <div
                  key={branch.id}
                  style={{
                    padding: '20px 24px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: 'var(--primary)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {branch.code.split('-')[1] || 'HQ'}
                      </div>
                      <div>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                          {branch.name}
                        </strong>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Quản lý: {branch.managerName} • {branch.tablesCount} bàn phục vụ
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {branch.dailyRevenue.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <StatusBadge status={branch.status} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        height: '9px',
                        width: '100%',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          backgroundColor: branch.status === 'ACTIVE' ? 'var(--primary)' : 'var(--text-light)',
                          borderRadius: '10px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
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
                    {ord.branchName} • {ord.tableNo || 'Mang về / Đặt online'}
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
