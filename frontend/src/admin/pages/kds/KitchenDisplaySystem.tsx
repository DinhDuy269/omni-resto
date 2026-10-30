import React, { useState } from 'react';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Utensils, Sparkles, Wifi, Flame, AlertTriangle } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import type { OrderStatus } from '../../../shared/types/admin';
import { useWebSocket } from '../../../shared/hooks/useWebSocket';

export const KitchenDisplaySystem: React.FC = () => {
  const { orders, updateOrderStatus, handleWebSocketOrderEvent } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<string>('KITCHEN_ACTIVE');

  // Real-time WebSocket connection hook
  const { isConnected } = useWebSocket((event) => {
    if (event?.order) {
      handleWebSocketOrderEvent(event as any);
    }
  });

  // Filter orders relevant for Kitchen (PENDING, CONFIRMED, PREPARING, READY)
  const kitchenOrders = orders.filter((order) => {
    if (filterStatus === 'KITCHEN_ACTIVE') {
      return (
        order.status === 'pending' ||
        order.status === 'confirmed' ||
        order.status === 'preparing' ||
        order.status === 'ready'
      );
    }
    return order.status === filterStatus;
  });

  const confirmedCount = orders.filter((o) => o.status === 'confirmed' || o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Đơn Chờ Xác Nhận', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', icon: AlertCircle };
      case 'confirmed':
        return { label: 'Hàng Đợi Nấu', bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', icon: Clock };
      case 'preparing':
        return { label: 'Đang Nấu', bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', icon: Flame };
      case 'ready':
        return { label: 'Sẵn Sàng Trả', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', icon: CheckCircle2 };
      default:
        return { label: status, bg: 'rgba(148, 163, 184, 0.12)', color: '#64748b', icon: Clock };
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── KITCHEN HEADER BAR ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-surface)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              color: '#ffffff',
            }}
          >
            <ChefHat size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Màn Hình Bếp Trực Quan (KDS)
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isConnected ? 'var(--success-bg)' : 'var(--warning-bg)',
                  color: isConnected ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${isConnected ? 'var(--success-border)' : 'var(--warning-border)'}`,
                }}
              >
                <Wifi size={12} /> {isConnected ? 'Real-time Live' : 'Polling Sync'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Điều phối tiến trình chế biến món ăn thời gian thực theo thứ tự vào bếp (FIFO)
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'KITCHEN_ACTIVE', label: `Tất cả đơn bếp (${kitchenOrders.length})` },
            { id: 'confirmed', label: `🔵 Chờ nấu (${confirmedCount})` },
            { id: 'preparing', label: `🟡 Đang chế biến (${preparingCount})` },
            { id: 'ready', label: `🟢 Sẵn sàng trả (${readyCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className="btn btn-sm"
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: filterStatus === tab.id ? 'var(--primary)' : 'var(--bg-app)',
                color: filterStatus === tab.id ? '#ffffff' : 'var(--text-body)',
                border: `1px solid ${filterStatus === tab.id ? 'var(--primary)' : 'var(--border-color)'}`,
                boxShadow: filterStatus === tab.id ? '0 2px 8px var(--primary-glow)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ORDERS EMPTY STATE ── */}
      {kitchenOrders.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '64px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Sparkles size={48} color="var(--primary)" style={{ opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Khu vực bếp hiện đã hoàn thành toàn bộ món ăn
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: 0 }}>
            Khi khách hàng đặt món tại bàn hoặc qua ứng dụng, thẻ đơn sẽ tự động xuất hiện và phát tín hiệu tại đây.
          </p>
        </div>
      ) : (
        /* ── KDS CARDS GRID (Touch-friendly for Chefs) ── */
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
            const isCooking = order.status === 'preparing';
            const isPendingConfirm = order.status === 'pending' || order.status === 'confirmed';

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius-lg)',
                  border: isPendingConfirm
                    ? '2px solid #3b82f6'
                    : isCooking
                    ? '2px solid #f59e0b'
                    : '1.5px solid var(--border-color)',
                  boxShadow: isCooking
                    ? '0 6px 20px rgba(245, 158, 11, 0.15)'
                    : isPendingConfirm
                    ? '0 6px 20px rgba(59, 130, 246, 0.15)'
                    : 'var(--shadow-sm)',
                  padding: '20px',
                  gap: '16px',
                  background: 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header of Order Card */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: 'var(--primary)',
                          letterSpacing: '0.5px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {order.order_number}
                      </span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {order.order_type === 'dine_in'
                          ? `📍 ${order.table_no || 'Bàn Chưa Gán'}`
                          : order.order_type === 'takeaway'
                          ? '🛍️ Mang Về'
                          : '🛵 Giao Hàng'}
                        {order.customer_name && ` • ${order.customer_name}`}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: statusConfig.bg,
                        color: statusConfig.color,
                        fontSize: '0.75rem',
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

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    <Clock size={14} /> Thời gian nhận: <strong>{order.created_at || 'Mới nhận'}</strong>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0 14px' }} />

                  {/* Items List - High Contrast */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {order.items.map((item, idx) => {
                      const isCancelled = item.status === 'cancelled';
                      return (
                      <div
                        key={idx}
                        style={{
                          background: isCancelled ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-app)',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: isCancelled ? '1.5px dashed var(--danger)' : '1px solid var(--border-subtle)',
                          opacity: isCancelled ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: isCancelled ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '1rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            <span
                              style={{
                                color: isCancelled ? 'var(--danger)' : 'var(--primary)',
                                marginRight: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 900,
                              }}
                            >
                              {item.quantity}x
                            </span>
                            {item.name}
                          </span>
                          {isCancelled && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: 'var(--danger)', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                              ĐÃ HỦY - KHÔNG NẤU
                            </span>
                          )}
                        </div>

                        {/* Modifiers / Options Badges (Sizes & Toppings) */}
                        {item.options && item.options.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {item.options.map((opt, optIdx) => {
                              const isSize = opt.option_type?.toLowerCase() === 'size';
                              return (
                                <span
                                  key={optIdx}
                                  style={{
                                    fontSize: '0.775rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: isSize ? '#e0e7ff' : '#ecfdf5',
                                    color: isSize ? '#3730a3' : '#065f46',
                                    border: isSize ? '1px solid #c7d2fe' : '1px solid #a7f3d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  {isSize ? '📏' : '➕'} {opt.option_name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Special Kitchen Dặn Bếp Notes */}
                        {item.notes && (
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '0.825rem',
                              color: '#b45309',
                              fontWeight: 700,
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <AlertTriangle size={14} color="#b45309" />
                            <span>Ghi chú bếp: {item.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>

                {/* Footer Action Controls - Large touch buttons for kitchen */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#ffffff',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.925rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px var(--primary-glow)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Utensils size={18} /> Bắt Đầu Chế Biến
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.925rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CheckCircle2 size={18} /> Hoàn Thành Nấu
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed', true)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.925rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px var(--primary-glow)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CheckCircle2 size={18} /> Trả Món / Phục Vụ
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
export default KitchenDisplaySystem;
