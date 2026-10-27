import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  CreditCard,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle,
  Utensils,
  Filter,
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { StatCard } from '../../components/StatCard';

export const ChainOrdersManagement: React.FC = () => {
  const { orders, updateOrderStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusTab === 'ALL' || ord.status === statusTab;
    const matchesType = orderTypeFilter === 'ALL' || ord.order_type === orderTypeFilter;
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ord.table_no && ord.table_no.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusCount = (status: string) => {
    if (status === 'ALL') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const pendingCount = getStatusCount('PENDING');
  const preparingCount = getStatusCount('PREPARING');
  const readyCount = getStatusCount('READY');
  const completedRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Quản Lý Đơn Hàng Live ({orders.length})
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Theo dõi luồng chế biến, xuất hóa đơn và xử lý thanh toán thời gian thực toàn chuỗi
          </p>
        </div>

        {/* View Switcher Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <button
              onClick={() => setViewMode('TABLE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
                color: viewMode === 'TABLE' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'TABLE' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'TABLE' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={15} /> Bảng Thu Ngân
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'CARDS' ? '#ffffff' : 'transparent',
                color: viewMode === 'CARDS' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'CARDS' ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'CARDS' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={15} /> Thẻ Chi Tiết
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 KPI STATS MINI ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          title="ĐƠN CẦN DUYỆT"
          value={pendingCount}
          change={pendingCount > 0 ? 'Cần duyệt ngay' : 'Đã xử lý hết'}
          isPositive={pendingCount === 0}
          icon={AlertTriangle}
          iconBgColor={pendingCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'}
          iconColor={pendingCount > 0 ? 'var(--danger)' : 'var(--success)'}
          subtitle="Chờ xác nhận vào bếp"
        />
        <StatCard
          title="ĐANG NẤU BẾP"
          value={preparingCount}
          change="Bếp đang chạy"
          isPositive={true}
          icon={Utensils}
          iconBgColor="var(--warning-bg)"
          iconColor="var(--warning)"
          subtitle="Đang chế biến trên KDS"
        />
        <StatCard
          title="SẴN SÀNG TRẢ MÓN"
          value={readyCount}
          change="Sẵn sàng"
          isPositive={true}
          icon={CheckCircle}
          iconBgColor="var(--info-bg)"
          iconColor="var(--info)"
          subtitle="Chờ phục vụ ra bàn"
        />
        <StatCard
          title="DOANH THU ĐƠN HOÀN TẤT"
          value={`${completedRevenue.toLocaleString('vi-VN')} đ`}
          change="+15.2%"
          isPositive={true}
          icon={CreditCard}
          iconBgColor="var(--primary-subtle)"
          iconColor="var(--primary)"
          subtitle="Đã thanh toán thực tế"
        />
      </div>

      {/* ── BỘ LỌC TÌM KIẾM & PHÂN LOẠI ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '340px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm mã đơn (ORD-HN-8841), tên khách, số bàn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Lọc loại đơn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hình thức:</span>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}
            >
              <option value="ALL">Tất Cả Hình Thức</option>
              <option value="DINE_IN">Ăn Tại Bàn (Dine-in)</option>
              <option value="DELIVERY">Giao Hàng (Online)</option>
              <option value="TAKEAWAY">Mang Về (Takeaway)</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Đơn' },
            { id: 'PENDING', label: 'Chờ Duyệt' },
            { id: 'PREPARING', label: 'Đang Nấu Bếp' },
            { id: 'READY', label: 'Sẵn Sàng Giao' },
            { id: 'COMPLETED', label: 'Hoàn Tất' },
            { id: 'CANCELLED', label: 'Đã Hủy' },
          ].map((tab) => {
            const count = getStatusCount(tab.id);
            return (
              <button
                key={tab.id}
                className={`btn btn-sm ${statusTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: statusTab === tab.id ? 700 : 500,
                }}
                onClick={() => setStatusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: statusTab === tab.id ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VIEW 1: BẢNG THU NGÂN COMPACT (TABLE VIEW) ── */}
      {viewMode === 'TABLE' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Mã Đơn
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Hình Thức / Bàn
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Khách Hàng
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Chi Tiết Món
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tổng Tiền
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Trạng Thái
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Không có đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isPending = ord.status === 'PENDING';
                    return (
                      <tr
                        key={ord.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isPending ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.9rem' }}>
                              {ord.order_number}
                            </strong>
                            {isPending && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  backgroundColor: 'var(--danger-bg)',
                                  color: 'var(--danger)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--danger-border)',
                                }}
                              >
                                MỚI
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ord.created_at}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor:
                                ord.order_type === 'DINE_IN'
                                  ? 'var(--info-bg)'
                                  : ord.order_type === 'DELIVERY'
                                  ? 'var(--purple-bg)'
                                  : 'var(--warning-bg)',
                              color:
                                ord.order_type === 'DINE_IN'
                                  ? 'var(--info)'
                                  : ord.order_type === 'DELIVERY'
                                  ? 'var(--purple)'
                                  : 'var(--warning)',
                            }}
                          >
                            {ord.order_type === 'DINE_IN'
                              ? `📍 ${ord.table_no || 'Tại Bàn'}`
                              : ord.order_type === 'DELIVERY'
                              ? '🛵 Giao Hàng'
                              : '🛍️ Mang Về'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            {ord.customer_name || 'Khách vãng lai'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            TT: {ord.payment_method || 'Tiền mặt'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600 }}>
                            {ord.items.length} món ăn
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={ord.items.map((i) => {
                              const optStr = i.options && i.options.length > 0 ? ` (${i.options.map((o) => o.option_name || o.optionName).join(', ')})` : '';
                              return `${i.quantity}x ${i.name}${optStr}`;
                            }).join(', ')}
                          >
                            {ord.items.map((i) => {
                              const optStr = i.options && i.options.length > 0 ? ` (${i.options.map((o) => o.option_name || o.optionName).join(', ')})` : '';
                              return `${i.quantity}x ${i.name}${optStr}`;
                            }).join(', ')}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                            {ord.total_amount.toLocaleString('vi-VN')} đ
                          </strong>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <StatusBadge status={ord.status} size="sm" />
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {ord.status === 'PENDING' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => updateOrderStatus(ord.id, 'PREPARING')}
                              >
                                Duyệt Bếp
                              </button>
                            )}
                            {ord.status === 'PREPARING' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: 'var(--purple)', color: '#ffffff', border: 'none' }}
                                onClick={() => updateOrderStatus(ord.id, 'READY')}
                              >
                                Báo Xong
                              </button>
                            )}
                            {ord.status === 'READY' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: 'var(--success)', color: '#ffffff', border: 'none' }}
                                onClick={() => updateOrderStatus(ord.id, 'COMPLETED')}
                              >
                                Trả Món
                              </button>
                            )}
                            {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc muốn hủy đơn ${ord.order_number}?`)) {
                                    updateOrderStatus(ord.id, 'CANCELLED');
                                  }
                                }}
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: THẺ CHI TIẾT (CARD VIEW) ── */}
      {viewMode === 'CARDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isPending = ord.status === 'PENDING';
              return (
                <div
                  key={ord.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    borderLeft: `4px solid ${
                      ord.status === 'PENDING'
                        ? 'var(--danger)'
                        : ord.status === 'PREPARING'
                        ? 'var(--warning)'
                        : ord.status === 'READY'
                        ? 'var(--purple)'
                        : ord.status === 'COMPLETED'
                        ? 'var(--success)'
                        : '#94a3b8'
                    }`,
                    boxShadow: isPending ? '0 4px 16px rgba(239, 68, 68, 0.12)' : 'var(--shadow-sm)',
                  }}
                >
                  {/* Top Bar of Order */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={20} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                            {ord.order_number}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor:
                                ord.order_type === 'DINE_IN'
                                  ? 'var(--info-bg)'
                                  : ord.order_type === 'DELIVERY'
                                  ? 'var(--purple-bg)'
                                  : 'var(--warning-bg)',
                              color:
                                ord.order_type === 'DINE_IN'
                                  ? 'var(--info)'
                                  : ord.order_type === 'DELIVERY'
                                  ? 'var(--purple)'
                                  : 'var(--warning)',
                            }}
                          >
                            {ord.order_type === 'DINE_IN'
                              ? `📍 ${ord.table_no || 'Chưa xếp bàn'}`
                              : ord.order_type === 'DELIVERY'
                              ? '🛵 Giao Hàng'
                              : '🛍️ Mang Về'}
                          </span>

                          {isPending && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                backgroundColor: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--danger-border)',
                                animation: 'pulse 1.5s infinite',
                              }}
                            >
                              ⚠️ Cần duyệt ngay
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Tạo lúc: <strong>{ord.created_at}</strong> {ord.customer_name ? `• Khách: ${ord.customer_name}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG TIỀN</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', fontFeatureSettings: "'tnum' 1" }}>
                          {ord.total_amount.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                      <StatusBadge status={ord.status} />
                    </div>
                  </div>

                  {/* Items Breakdown Table */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {ord.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <div>
                            <strong style={{ color: 'var(--text-main)' }}>
                              {item.quantity}x {item.name}
                            </strong>
                            {item.notes && (
                              <span style={{ marginLeft: '8px', color: 'var(--danger)', fontSize: '0.78125rem', fontWeight: 600 }}>
                                ({item.notes})
                              </span>
                            )}
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {item.options.map((opt, optIdx) => {
                                const isSize = (opt.option_type || opt.optionType)?.toUpperCase() === 'SIZE';
                                return (
                                  <span
                                    key={optIdx}
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      background: isSize ? '#e0e7ff' : '#ecfdf5',
                                      color: isSize ? '#3730a3' : '#065f46',
                                      border: isSize ? '1px solid #c7d2fe' : '1px solid #a7f3d0',
                                    }}
                                  >
                                    {isSize ? '📏' : '➕'} {opt.option_name || opt.optionName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontFeatureSettings: "'tnum' 1" }}>
                          {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer & Action Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <CreditCard size={15} />
                      <span>Thanh toán: <strong>{ord.payment_method}</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {ord.status === 'PENDING' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => updateOrderStatus(ord.id, 'PREPARING')}
                        >
                          Duyệt & Gửi Bếp Nấu
                        </button>
                      )}
                      {ord.status === 'PREPARING' && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--purple)', color: '#ffffff', border: 'none' }}
                          onClick={() => updateOrderStatus(ord.id, 'READY')}
                        >
                          Báo Đã Xong Món
                        </button>
                      )}
                      {ord.status === 'READY' && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--success)', color: '#ffffff', border: 'none' }}
                          onClick={() => updateOrderStatus(ord.id, 'COMPLETED')}
                        >
                          Xác Nhận Trả Món
                        </button>
                      )}
                      {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm(`Hủy đơn ${ord.order_number}?`)) {
                              updateOrderStatus(ord.id, 'CANCELLED');
                            }
                          }}
                        >
                          Hủy Đơn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
export default ChainOrdersManagement;
