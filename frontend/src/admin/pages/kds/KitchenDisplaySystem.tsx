import React, { useState } from 'react';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Utensils, Sparkles, Wifi } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import type { OrderStatus } from '../../../shared/types/admin';
import { useWebSocket } from '../../../shared/hooks/useWebSocket';

export const KitchenDisplaySystem: React.FC = () => {
  const { orders, updateOrderStatus, handleWebSocketOrderEvent } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<string>('KITCHEN_ACTIVE');

  // Real-time WebSocket connection hook
  const { isConnected } = useWebSocket(handleWebSocketOrderEvent);

  // Filter orders relevant for Kitchen (PENDING, PREPARING, READY)
  const kitchenOrders = orders.filter((order) => {
    if (filterStatus === 'KITCHEN_ACTIVE') {
      return order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'READY';
    }
    return order.status === filterStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Đơn Mới', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: AlertCircle };
      case 'PREPARING':
        return { label: 'Đang Nấu', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: Utensils };
      case 'READY':
        return { label: 'Sẵn Sàng', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: CheckCircle2 };
      default:
        return { label: status, bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', icon: Clock };
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-surface)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
          >
            <ChefHat size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Màn Hình Bếp Trực Quan (KDS)
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isConnected ? '#10b981' : '#f59e0b',
                  border: `1px solid ${isConnected ? '#10b981' : '#f59e0b'}`,
                }}
              >
                <Wifi size={12} /> {isConnected ? 'Real-time Live' : 'Polling Sync'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Điều phối tiến trình chế biến món ăn thời gian thực theo từng đơn hàng
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'KITCHEN_ACTIVE', label: 'Tất cả đơn bếp' },
            { id: 'PENDING', label: '🔴 Đơn chờ nhận' },
            { id: 'PREPARING', label: '🟡 Đang chế biến' },
            { id: 'READY', label: '🟢 Đã xong' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className="btn"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                background: filterStatus === tab.id ? 'var(--primary-color)' : 'var(--bg-card)',
                color: filterStatus === tab.id ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {kitchenOrders.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Sparkles size={48} color="var(--primary-color)" style={{ opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Hiện chưa có đơn hàng cần chế biến
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
            Khi khách hàng chọn món hoặc nhân viên tạo đơn mới, các thẻ đơn hàng sẽ hiển thị tại đây thời gian thực.
          </p>
        </div>
      ) : (
        /* Orders Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {kitchenOrders.map((order) => {
            const statusConfig = getStatusBadge(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: order.status === 'PENDING' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                  boxShadow: order.status === 'PENDING' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
                  padding: '20px',
                  gap: '16px',
                  background: 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header of Order Card */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: 'var(--primary-color)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {order.orderNumber}
                      </span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                        {order.orderType === 'DINE_IN' ? `📍 ${order.tableNo || 'Bàn Ăn'}` : order.orderType === 'TAKEAWAY' ? '🛍️ Mang Về' : '🛵 Giao Hàng'}
                        {order.customerName && ` • ${order.customerName}`}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: statusConfig.bg,
                        color: statusConfig.color,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <Clock size={14} /> {order.createdAt || 'Mới nhận'}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0 14px' }} />

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card)',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.925rem' }}>
                            <span style={{ color: 'var(--primary-color)', marginRight: '6px' }}>{item.quantity}x</span>
                            {item.name}
                          </span>
                        </div>
                        {item.notes && (
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '0.8rem',
                              color: '#f59e0b',
                              fontWeight: 600,
                              background: 'rgba(245, 158, 11, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                            }}
                          >
                            ⚠️ Ghi chú: {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#f59e0b',
                        color: '#ffffff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Utensils size={16} /> Bắt Đầu Chế Biến
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} /> Báo Hoàn Thành Món
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'var(--primary-color)',
                        color: '#ffffff',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={16} /> Phục Vụ / Trả Đơn
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
