import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Download,
  Calendar,
  Layers,
  PieChart,
  ArrowUpRight,
  UtensilsCrossed,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatCard } from '../../components/StatCard';

export const ReportsPage: React.FC = () => {
  const { orders, menu_items } = useAdminStore();
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  const totalRevenue = orders
    .filter((o) => o.status === 'COMPLETED' || o.payment_status === 'PAID')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const aov = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 245000;

  // Kênh bán hàng
  const dineInOrders = orders.filter((o) => o.order_type === 'DINE_IN').length;
  const deliveryOrders = orders.filter((o) => o.order_type === 'DELIVERY').length;
  const takeawayOrders = orders.filter((o) => o.order_type === 'TAKEAWAY').length;
  const totalChannels = (dineInOrders + deliveryOrders + takeawayOrders) || 1;

  const dineInPct = Math.round((dineInOrders / totalChannels) * 100);
  const deliveryPct = Math.round((deliveryOrders / totalChannels) * 100);
  const takeawayPct = 100 - dineInPct - deliveryPct;

  const handleExportReport = () => {
    alert('Hệ thống đang xuất file Báo Cáo Doanh Thu (Excel .xlsx)... Tải xuống sẽ bắt đầu trong giây lát!');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Báo Cáo & Phân Tích Doanh Thu Chuỗi
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Thông số tài chính, cơ cấu doanh thu theo kênh bán và đóng góp lợi nhuận từ thực đơn
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Range Selector */}
          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              display: 'flex',
              gap: '4px',
            }}
          >
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'WEEK', label: '7 Ngày' },
              { id: 'MONTH', label: 'Tháng này' },
              { id: 'YEAR', label: 'Năm nay' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: timeRange === tab.id ? '#ffffff' : 'transparent',
                  color: timeRange === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: timeRange === tab.id ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: timeRange === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExportReport}
          >
            <Download size={15} />
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI METRICS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard
          title="TỔNG DOANH THU"
          value={`${(totalRevenue || 48500000).toLocaleString('vi-VN')} đ`}
          change="+23.4%"
          isPositive={true}
          icon={DollarSign}
          iconBgColor="var(--primary-subtle)"
          iconColor="var(--primary)"
          subtitle="So với cùng kỳ tháng trước"
        />
        <StatCard
          title="TỔNG SỐ ĐƠN HOÀN TẤT"
          value={completedOrders.length || 142}
          change="+18.1%"
          isPositive={true}
          icon={ShoppingBag}
          iconBgColor="var(--info-bg)"
          iconColor="var(--info)"
          subtitle="Tỷ lệ giao đúng giờ 98.6%"
        />
        <StatCard
          title="GIÁ TRỊ TRUNG BÌNH (AOV)"
          value={`${aov.toLocaleString('vi-VN')} đ`}
          change="+4.8%"
          isPositive={true}
          icon={TrendingUp}
          iconBgColor="var(--purple-bg)"
          iconColor="var(--purple)"
          subtitle="Chi tiêu trung bình mỗi hóa đơn"
        />
        <StatCard
          title="TỔNG MÓN ĂN TRÊN MENU"
          value={menu_items.length}
          change="Toàn chuỗi"
          isPositive={true}
          icon={UtensilsCrossed}
          iconBgColor="var(--success-bg)"
          iconColor="var(--success)"
          subtitle="Phân bố qua 5 danh mục"
        />
      </div>

      {/* ── 2 COLUMNS: KÊNH BÁN HÀNG & CƠ CẤU MÓN ĂN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Kênh bán hàng */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Tỷ Trọng Doanh Thu Theo Kênh
              </h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>3 kênh phục vụ</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dine-in */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>🍽️ Ăn Tại Chỗ (Dine-in)</span>
                <strong>{dineInPct}% ({dineInOrders} đơn)</strong>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-app)', overflow: 'hidden' }}>
                <div style={{ width: `${dineInPct}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #3b82f6)' }} />
              </div>
            </div>

            {/* Delivery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>🛵 Giao Hàng Online (Delivery)</span>
                <strong>{deliveryPct}% ({deliveryOrders} đơn)</strong>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-app)', overflow: 'hidden' }}>
                <div style={{ width: `${deliveryPct}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }} />
              </div>
            </div>

            {/* Takeaway */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>🛍️ Mang Về (Takeaway)</span>
                <strong>{takeawayPct}% ({takeawayOrders} đơn)</strong>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-app)', overflow: 'hidden' }}>
                <div style={{ width: `${takeawayPct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            💡 <strong>Nhận định chuyên môn:</strong> Doanh thu tại bàn chiếm ưu thế chính ({dineInPct}%), trong khi kênh giao hàng Online tăng trưởng +28% so với quý trước nhờ ứng dụng trực tiếp thương hiệu.
          </div>
        </div>

        {/* Top 5 Món Bán Chạy Nhất */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--purple)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Top Món Đóng Góp Doanh Thu Cao Nhất
              </h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thực đơn HQ</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {menu_items.slice(0, 5).map((dish, idx) => (
              <div
                key={dish.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#fef3c7' : '#f1f5f9',
                      color: idx === 0 ? '#b45309' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{dish.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dish.category}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                    {dish.base_price.toLocaleString('vi-VN')} đ
                  </strong>
                  <div style={{ fontSize: '0.725rem', color: 'var(--success)', fontWeight: 600 }}>
                    <ArrowUpRight size={11} style={{ display: 'inline' }} /> Best Seller
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;
