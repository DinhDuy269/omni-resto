import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, X, Clock, Flame, Bell, Utensils } from 'lucide-react';
import { useClientStore } from '../store/clientStore';

export const ClientActiveOrderBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orders = useClientStore((s) => s.orders);
  const tableSession = useClientStore((s) => s.tableSession);
  const [isDismissed, setIsDismissed] = useState(false);

  // Lọc tất cả đơn hàng đang hoạt động (chưa hoàn thành)
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');

  // Không hiển thị nếu không có đơn nào đang hoạt động, người dùng đã tắt hoặc đang ở trang danh sách đơn
  if (activeOrders.length === 0 || isDismissed) return null;
  if (location.pathname === '/client/orders') return null;

  // Tính toán tổng số lượng món ăn và số đợt gọi món
  const totalDishesCount = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + (it.quantity || 1), 0),
    0
  );
  const roundsCount = activeOrders.length;
  const currentTable = tableSession?.tableNo || activeOrders[0]?.tableNo;

  // Xác định trạng thái tổng thể của các món
  const hasReady = activeOrders.some((o) => o.status === 'READY');
  const hasPreparing = activeOrders.some((o) => o.status === 'PREPARING');

  const getStatusBadge = () => {
    if (hasReady) {
      return {
        label: 'Theo dõi tiến độ món ăn',
        subLabel: `🔔 Có món đã sẵn sàng · Tổng ${totalDishesCount} món (${roundsCount} đợt gọi)`,
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#86efac',
        icon: <Bell size={18} className="c-pulse" color="#16a34a" />,
      };
    }
    if (hasPreparing) {
      return {
        label: 'Theo dõi tiến độ món ăn',
        subLabel: `🔥 Bếp đang nấu ${totalDishesCount} món · ${roundsCount} đợt gọi món`,
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#fdba74',
        icon: <Flame size={18} className="c-pulse" color="#ea580c" />,
      };
    }
    return {
      label: 'Theo dõi tiến độ món ăn',
      subLabel: `⏳ Đang tiếp nhận ${totalDishesCount} món · ${roundsCount} đợt gọi món`,
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#7dd3fc',
      icon: <Clock size={18} color="#0284c7" />,
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'calc(100% - 32px)',
        maxWidth: '560px',
        animation: 'c-fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          border: `1.5px solid ${statusBadge.border}`,
          borderRadius: 'var(--c-r-full, 9999px)',
          padding: '8px 12px 8px 16px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onClick={() => navigate('/client/orders')}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Status Indicator & Dish Progress Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: statusBadge.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {statusBadge.icon}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--c-text-main, #0f172a)',
                  whiteSpace: 'nowrap',
                }}
              >
                {statusBadge.label}
              </span>
              {currentTable && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#ea580c',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    padding: '1px 8px',
                    borderRadius: '999px',
                    fontWeight: 700,
                  }}
                >
                  {currentTable}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: statusBadge.color,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px',
              }}
            >
              {statusBadge.subLabel}
            </div>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            className="c-btn c-btn-primary"
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--c-r-full, 9999px)',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/client/orders');
            }}
          >
            <Utensils size={14} />
            <span>Xem tất cả</span>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-text-muted, #64748b)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
            title="Tạm ẩn thanh theo dõi"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientActiveOrderBar;
