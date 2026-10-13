import React, { useState } from 'react';
import { ShoppingBag, Search, CreditCard } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';

export const ChainOrdersManagement: React.FC = () => {
  const { orders, updateOrderStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusTab === 'ALL' || ord.status === statusTab;
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusCount = (status: string) => {
    if (status === 'ALL') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Quản Lý Đơn Hàng Live ({filteredOrders.length})
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Theo dõi luồng chế biến, giao hàng và thanh toán trực tiếp tại nhà hàng
        </p>
      </div>

      {/* Tabs & Filters */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '320px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm mã đơn (ORD-HN-8841), tên khách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Đơn' },
            { id: 'PENDING', label: 'Mới Đặt (Cần Duyệt)' },
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
                onClick={() => setStatusTab(tab.id)}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredOrders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft: `4px solid ${
                  ord.status === 'PENDING'
                    ? 'var(--info)'
                    : ord.status === 'PREPARING'
                    ? 'var(--warning)'
                    : ord.status === 'READY'
                    ? 'var(--purple)'
                    : ord.status === 'COMPLETED'
                    ? 'var(--success)'
                    : 'var(--danger)'
                }`,
              }}
            >
              {/* Top Bar of Order */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                    }}
                  >
                    <ShoppingBag size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {ord.order_number}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.725rem',
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
                          ? `Ăn Tại Bàn (${ord.table_no || 'Chưa xếp'})`
                          : ord.order_type === 'DELIVERY'
                          ? 'Giao Hàng (Online)'
                          : 'Mang Về (Takeaway)'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Tạo lúc: <strong>{ord.created_at}</strong> {ord.customer_name ? `• Khách: ${ord.customer_name}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG TIỀN</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
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
                      fontSize: '0.84rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {item.quantity}x {item.name}
                      </strong>
                      {item.notes && (
                        <span style={{ marginLeft: '8px', color: 'var(--danger)', fontSize: '0.78125rem', fontStyle: 'italic' }}>
                          ({item.notes})
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Footer & Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
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
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: 'var(--purple)', borderColor: 'var(--purple)' }}
                      onClick={() => updateOrderStatus(ord.id, 'READY')}
                    >
                      Báo Đã Xong Món
                    </button>
                  )}
                  {ord.status === 'READY' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                      onClick={() => updateOrderStatus(ord.id, 'COMPLETED')}
                    >
                      Xác Nhận Hoàn Tất
                    </button>
                  )}
                  {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => updateOrderStatus(ord.id, 'CANCELLED')}
                    >
                      Hủy Đơn
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
